import { CommonModule, Location } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { generateClient } from 'aws-amplify/data';
import * as CANNON from 'cannon-es';
import { BehaviorSubject, Subscription, timer } from 'rxjs';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Schema } from '../../../amplify/data/resource';
import { ChatComponent } from '../chat/chat.component';
import { UserService } from '../user.service';

interface DieVector3 {
  x: number;
  y: number;
  z: number;
}
interface DieQuaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}
interface Die {
  position: DieVector3;
  quaternion: DieQuaternion;
  velocity: DieVector3;
  angularVelocity: DieVector3;
}
interface ThrowDiceResponse {
  gravity: DieVector3;
  groundPosition: DieVector3;
  dice: Die[];
}

interface Player {
  id: string;
  name: string;
}

interface DataClientQueryLike {
  query?: Record<string, (args: unknown) => Promise<ThrowDiceResponse>>;
  [k: string]: unknown;
}

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, ChatComponent],
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css'],
})
export class GameComponent implements OnInit {
  @ViewChild('canvas', { static: true })
  private readonly canvasRef!: ElementRef<HTMLCanvasElement>;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private world!: CANNON.World;
  private readonly diceBody!: CANNON.Body;
  private readonly diceBodies: CANNON.Body[] = [];
  private readonly diceMeshes: THREE.Mesh[] = [];

  public currentPlayerIndex = 0;
  public players: Player[] = [];
  public readyState = new Map<string, boolean>();
  public countdown$ = new BehaviorSubject<number | null>(null);
  private countdownSub: Subscription | null = null;

  // Game state
  public diceValues: number[] = [];
  public keptDiceValues = new Map<number, number>();
  public rollsLeft = 3;
  private currentUserId: string | null = null;

  // Scoring
  public showScoreSelection = false;
  public scoreOptions: { category: string; score: number }[] = [];
  public playerScores = new Map<string, Map<string, number>>();
  public showAllPlayers = false;

  public readonly scoreCategories = [
    'Ykköset',
    'Kakkoset',
    'Kolmoset',
    'Neloset',
    'Vitoset',
    'Kutoset',
    'Bonus',
    'Pari',
    'Kaksi paria',
    'Kolme paria',
    'Kolme samaa',
    'Neljä samaa',
    'Viisi samaa',
    'Pieni suora',
    'Iso suora',
    'Täysi suora',
    'Täyskäsi',
    'Superkäsi',
    'Torni',
    'Sattuma',
    'Maxi Jatsi',
  ];

  public readonly upperCategories = [
    'Ykköset',
    'Kakkoset',
    'Kolmoset',
    'Neloset',
    'Vitoset',
    'Kutoset',
  ];

  private readonly _location = inject(Location);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly userService = inject(UserService);
  private readonly client = generateClient<Schema>();
  public gameId: string | null = null;
  public gameState: string | null = null;
  private inited = false;
  private animating = false;

  backClicked() {
    this._location.back();
  }

  async quit() {
    try {
      // Clear user's gameId from database
      const user = await this.getUserProfile();
      if (user) {
        await this.client.models['User']['update'](
          { id: user.id, gameId: null },
          { authMode: 'userPool' }
        );

        // Cleanup empty game if this was the last player
        if (this.gameId) {
          try {
            const dc = this.client as typeof this.client & {
              mutations?: {
                cleanupEmptyGames?: (args: { gameId: string }) => Promise<unknown>;
              };
            };
            if (dc.mutations?.cleanupEmptyGames) {
              await dc.mutations.cleanupEmptyGames({ gameId: this.gameId });
            }
          } catch (cleanupError) {
            console.error('Virhe tyhjän pelin siivoamisessa:', cleanupError);
          }
        }
      }
    } catch (error) {
      console.error('Virhe gameId:n tyhjentämisessä', error);
    } finally {
      // Always navigate to lobby
      this.router.navigate(['/home']);
    }
  }

  private async getUserProfile() {
    try {
      const user = await this.userService.fetchData();
      const { data } = await this.client.models['User']['list']({
        filter: {
          profileOwner: {
            beginsWith: user?.userId,
          },
        },
      });
      return data[0] || null;
    } catch (error) {
      console.error('Error fetching user profile', error);
      return null;
    }
  }

  ngOnInit(): void {
    // Defer heavy 3D initialization until needed (lazy load)
    this.route.paramMap.subscribe(async (map) => {
      const id = map.get('gameId');
      if (!id) return;
      this.gameId = id;
      await this.loadGame(id);
    });
  }

  private async initThreeJS(): Promise<void> {
    this.initSceneAndCamera();
    this.initRenderer();
    await this.initLightsAndGround();
  }

  private initSceneAndCamera() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    // Higher camera position to see dice arc trajectory
    this.camera.position.set(0, 12, 15);
    this.camera.lookAt(0, 0, 0);
  }

  private initRenderer() {
    const canvasEl = this.canvasRef?.nativeElement;
    this.renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });
    this.renderer.shadowMap.enabled = true;

    // Initialize OrbitControls
    this.controls = new OrbitControls(this.camera, canvasEl);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0, 0, 0);

    const setRendererSize = () => {
      const w = canvasEl.clientWidth || window.innerWidth;
      const h = canvasEl.clientHeight || window.innerHeight;
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    };
    setRendererSize();
    window.addEventListener('resize', setRendererSize);
  }

  private async initLightsAndGround() {
    const ambientLight = new THREE.AmbientLight(0x808080);
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 30, 5);
    directionalLight.castShadow = true;

    // Configure shadow camera for wider coverage
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;

    this.scene.add(directionalLight);

    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const loader = new THREE.TextureLoader();
    let groundMaterial;

    try {
      const woodTexture = await loader.loadAsync('assets/wood.jpg');
      woodTexture.wrapS = THREE.RepeatWrapping;
      woodTexture.wrapT = THREE.RepeatWrapping;
      woodTexture.repeat.set(4, 4);
      groundMaterial = new THREE.MeshStandardMaterial({ map: woodTexture });
    } catch (e) {
      console.warn('Could not load wood texture, using fallback color', e);
      groundMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    }

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private async initPhysicsAndDice() {
    if (this.diceBodies.length > 0) return; // already initialized
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });

    // Enable sleep states
    this.world.allowSleep = true;

    const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(groundBody);
    const diceShape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));

    // Load lowpolydice model
    const gltfLoader = new GLTFLoader();
    let diceModel: THREE.Group | null = null;

    try {
      const gltf = await gltfLoader.loadAsync('assets/lowpolydice.glb');
      diceModel = gltf.scene;
    } catch (e) {
      console.warn('Could not load lowpolydice model, using fallback cube', e);
    }

    for (let i = 0; i < 6; i++) {
      let mesh: THREE.Mesh;

      if (diceModel) {
        // Clone the loaded model
        const clonedModel = diceModel.clone();
        clonedModel.scale.setScalar(0.5); // Scale down to match original cube size
        clonedModel.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        mesh = clonedModel as unknown as THREE.Mesh;
      } else {
        // Fallback to cube
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
        mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
      }

      mesh.position.set(0 + i * 1.2 - 3.6, 1 + i * 0.1, 0);
      this.scene.add(mesh);
      this.diceMeshes.push(mesh);

      const body = new CANNON.Body({
        mass: 1,
        shape: diceShape,
        position: new CANNON.Vec3(0, 5.5 + i, 0),
      });
      body.sleepSpeedLimit = 0.1;
      body.sleepTimeLimit = 1;
      this.world.addBody(body);
      this.diceBodies.push(body);
    }
  }

  private async loadGame(id: string) {
    try {
      const result = await this.client.models['Game']['list']({ filter: { id: { eq: id } } });
      const game = Array.isArray(result.data) && result.data.length ? result.data[0] : null;
      if (!game) {
        console.error('Peliä ei löytynyt');
        this.router.navigate(['/lobby']);
        return;
      }
      this.gameState = game.state;
      // load players in game via relation (simplified: query users with gameId)
      const usersResult = await this.client.models['User']['list']({
        filter: { gameId: { eq: id } },
      });
      const users = Array.isArray(usersResult.data)
        ? (usersResult.data as Record<string, unknown>[])
        : [];
      this.players = users.map((u) => {
        const id = typeof u['id'] === 'string' ? u['id'] : Math.random().toString();
        const name = typeof u['name'] === 'string' ? u['name'] : undefined;
        const profileOwner = typeof u['profileOwner'] === 'string' ? u['profileOwner'] : undefined;
        const display = name ?? profileOwner ?? id;
        return { id, name: display };
      });

      // Set ready state based on game state
      this.players.forEach((p) => {
        const isReady = this.gameState === 'ongoing';
        this.readyState.set(p.id, isReady);
      });

      // Ensure at least the current user is listed (when the query returns nothing or current user not found)
      if (this.players.length === 0) {
        await this.ensureLocalPlayerPresent();
      }

      // If game already ongoing, ensure UI reflects that
      if (this.gameState === 'ongoing') {
        // start game visual state
        this.countdown$.next(null);
      }
    } catch (error) {
      console.error('Virhe pelin lataamisessa', error);
    }
  }

  private async ensureLocalPlayerPresent(): Promise<void> {
    try {
      const me = await this.userService.fetchData();
      const { id, name } = this.displayNameFromUser(me);
      this.players = [{ id, name }];
      this.readyState.set(id, false);
    } catch {
      const id = Math.random().toString();
      this.players = [{ id, name: 'You' }];
      this.readyState.set(id, false);
    }
  }

  private displayNameFromUser(me: unknown): { id: string; name: string } {
    const id = this.extractUsername(me) ?? Math.random().toString();
    const name = this.extractNicknameOrName(me) ?? id ?? 'You';
    return { id, name };
  }

  private extractUsername(me: unknown): string | undefined {
    if (!me || typeof me !== 'object') return undefined;
    const asObj = me as Record<string, unknown>;
    if (typeof asObj['username'] === 'string') return asObj['username'];
    return undefined;
  }

  private extractNicknameOrName(me: unknown): string | undefined {
    if (!me || typeof me !== 'object') return undefined;
    const asObj = me as Record<string, unknown>;
    const attrs = asObj['attributes'] as Record<string, unknown> | undefined;
    if (attrs) {
      if (typeof attrs['nickname'] === 'string') return attrs['nickname'];
      if (typeof attrs['name'] === 'string') return attrs['name'];
    }
    return undefined;
  }

  toggleReady(playerIdOrName: string) {
    const current = this.readyState.get(playerIdOrName) ?? false;
    this.readyState.set(playerIdOrName, !current);
    this.checkAllReady();
  }

  private checkAllReady() {
    if (this.players.length === 0) return;
    const allReady = Array.from(this.readyState.values()).every(Boolean);
    if (allReady && this.gameState === 'joinable') {
      // start countdown and then set game to ongoing
      this.startCountdown(5);
    } else if (!allReady) {
      this.stopCountdown();
    }
  }

  private startCountdown(seconds: number) {
    if (this.countdownSub) return; // already running
    this.countdown$.next(seconds);
    this.countdownSub = timer(0, 1000).subscribe((tick) => {
      const val = seconds - tick;
      if (val >= 0) {
        this.countdown$.next(val);
      }
      if (val <= 0) {
        this.stopCountdown();
        this.beginGame();
      }
    });
  }

  private stopCountdown() {
    if (this.countdownSub) {
      this.countdownSub.unsubscribe();
      this.countdownSub = null;
    }
    this.countdown$.next(null);
  }

  private async beginGame() {
    if (!this.gameId) return;
    try {
      await this.client.models['Game']['update']({ id: this.gameId, state: 'ongoing' });
      this.gameState = 'ongoing';
      // Indicate start with a simple animation: raise camera a bit
      if (this.camera) {
        this.camera.position.set(0, 10, 20);
      }
    } catch (error) {
      console.error('Virhe pelin aloittamisessa', error);
    }
  }

  private lastTime = 0;

  private readonly animate = (currentTime = 0): void => {
    if (!this.animating) return;
    requestAnimationFrame(this.animate);

    // Calculate delta time
    const deltaTime = this.lastTime ? (currentTime - this.lastTime) / 1000 : 1 / 60;
    this.lastTime = currentTime;

    // Cap delta time to prevent large jumps
    const clampedDelta = Math.min(deltaTime, 1 / 30);

    // Update controls
    this.controls.update();

    // Step the physics world with delta time
    this.world.step(clampedDelta);

    // sync multiple dice (if any)
    for (let i = 0; i < this.diceMeshes.length; i++) {
      const mesh = this.diceMeshes[i];
      const body = this.diceBodies[i];
      if (!mesh || !body) continue;
      mesh.position.copy(new THREE.Vector3(body.position.x, body.position.y, body.position.z));
      mesh.quaternion.copy(
        new THREE.Quaternion(
          body.quaternion.x,
          body.quaternion.y,
          body.quaternion.z,
          body.quaternion.w
        )
      );
    }

    this.renderer.render(this.scene, this.camera);
  };

  async rollDice(): Promise<void> {
    if (!(await this.isPlayerTurn())) {
      console.warn(`Ei ole sinun vuorosi!`);
      return;
    }

    if (!this.canRoll()) {
      console.warn(`Ei voi heittää: rollsLeft=${this.rollsLeft}`);
      return;
    }

    if (!this.areDiceSettled()) {
      console.warn('Odota että nopat pysähtyvät!');
      return;
    }

    // lazy init 3D if needed
    if (!this.inited) {
      await this.initThreeJS();
      await this.initPhysicsAndDice();
      this.inited = true;
      this.animating = true;
      this.animate();
    }

    // Ensure animation is running when rolling (in case it was stopped)
    if (!this.animating) {
      this.animating = true;
      this.animate();
    }

    console.warn(`${this.players[this.currentPlayerIndex]?.name} heittää noppia.`);

    // Determine how many dice to roll (6 minus kept dice)
    const diceToRoll = 6 - this.keptDiceValues.size;

    // Call backend throwDice and apply response to dice
    await this.throwDiceRemote(diceToRoll);

    this.rollsLeft--;
  }

  private async throwDiceRemote(numberOfDice: number) {
    try {
      let response: ThrowDiceResponse | null = null;
      const dc = this.client as unknown as DataClientQueryLike;

      // try generated client query shape
      if (dc.query && typeof dc.query['throwDice'] === 'function') {
        response = await dc.query['throwDice']({ numberOfDice } as unknown);
      } else if (typeof dc['throwDice'] === 'function') {
        const fn = dc['throwDice'] as unknown as (args: unknown) => Promise<ThrowDiceResponse>;
        response = await fn({ numberOfDice } as unknown);
      }

      // fallback to local generation if backend not available or returned undefined
      if (!response?.dice) {
        response = this.localThrow(numberOfDice);
      }

      this.applyThrowResponse(response);
    } catch (error) {
      console.error('Virhe nopanheiton API:ssa, käytetään paikallista generointia', error);
      const fallback = this.localThrow(numberOfDice);
      this.applyThrowResponse(fallback);
    }
  }

  private localThrow(numberOfDice: number): ThrowDiceResponse {
    const dice: Die[] = [];

    for (let index = 0; index < numberOfDice; index++) {
      const position = {
        x: -6 + Math.random() * 2,
        y: 4 + Math.random(),
        z: -3 + Math.random() * 2,
      };

      const velocity = {
        x: 4 + Math.random() * 2,
        y: 2 + Math.random(),
        z: 1 + Math.random(),
      };

      const angularVelocity = {
        x: (Math.random() - 0.5) * 8,
        y: (Math.random() - 0.5) * 8,
        z: (Math.random() - 0.5) * 8,
      };

      // Random initial rotation
      const u1 = Math.random();
      const u2 = Math.random();
      const u3 = Math.random();
      const w = Math.sqrt(1 - u1) * Math.sin(2 * Math.PI * u2);
      const x = Math.sqrt(1 - u1) * Math.cos(2 * Math.PI * u2);
      const y = Math.sqrt(u1) * Math.sin(2 * Math.PI * u3);
      const z = Math.sqrt(u1) * Math.cos(2 * Math.PI * u3);
      const quaternion = { w, x, y, z };

      dice.push({ position, quaternion, velocity, angularVelocity });
    }

    return {
      gravity: { x: 0, y: -15.0, z: 0 }, // gentler gravity
      groundPosition: { x: 0, y: -0.5, z: 0 },
      dice,
    };
  }
  private applyThrowResponse(resp: ThrowDiceResponse) {
    this.setWorldGravity(resp.gravity);
    this.applyDiceArray(resp.dice);
  }

  private setWorldGravity(g: DieVector3 | undefined) {
    if (!g) return;
    if (typeof g.x === 'number' && typeof g.y === 'number' && typeof g.z === 'number') {
      this.world.gravity.set(g.x, g.y, g.z);
    }
  }

  private applyDiceArray(diceArr: Die[]) {
    let diceIndex = 0;

    for (let i = 0; i < this.diceBodies.length; i++) {
      const body = this.diceBodies[i];
      const mesh = this.diceMeshes[i];

      // Skip kept dice - don't move them
      if (this.keptDiceValues.has(i)) {
        continue;
      }

      const die = diceArr[diceIndex];
      if (!die || !body) continue;

      // Wake up sleeping bodies for subsequent throws
      body.wakeUp();
      // Reset body state for proper physics
      body.velocity.set(0, 0, 0);
      body.angularVelocity.set(0, 0, 0);

      this.applyDieToBody(body, mesh, die);
      diceIndex++;
    }

    // Start checking for dice settlement
    this.startSettlementCheck();
  }

  private extractDiceValues(): void {
    // Always initialize array with 6 elements
    this.diceValues = Array(6).fill(1);

    const upVector = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < 6; i++) {
      if (this.keptDiceValues.has(i)) {
        // Use kept value
        const keptValue = this.keptDiceValues.get(i);
        this.diceValues[i] = keptValue ?? 1;
      } else {
        // Calculate face value using dot product
        const body = this.diceBodies[i];
        if (body && this.diceBodies.length > 0) {
          this.diceValues[i] = this.getDiceFaceValue(body, upVector);
        } else {
          this.diceValues[i] = Math.floor(Math.random() * 6) + 1;
        }
      }
    }

    // Force UI update
    setTimeout(() => {
      // Trigger change detection
      this.diceValues = [...this.diceValues];
    }, 0);

    // Sync state to backend for multiplayer consistency
    this.syncDiceState();
    console.warn('Noppien arvot:', this.diceValues);

    // Auto-trigger score selection after last throw
    if (this.rollsLeft === 0) {
      this.endTurnWithScore();
    }
  }

  private getDiceFaceValue(body: CANNON.Body, upVector: THREE.Vector3): number {
    // Define dice face normals (standard die layout)
    const faceNormals = [
      new THREE.Vector3(0, 0, 1), // 1 (front)
      new THREE.Vector3(0, 0, -1), // 6 (back)
      new THREE.Vector3(-1, 0, 0), // 3 (left)
      new THREE.Vector3(1, 0, 0), // 4 (right)
      new THREE.Vector3(0, 1, 0), // 5 (top)
      new THREE.Vector3(0, -1, 0), // 2 (bottom)
    ];

    const faceValues = [1, 6, 3, 4, 5, 2];

    // Transform normals by die rotation
    const quaternion = new THREE.Quaternion(
      body.quaternion.x,
      body.quaternion.y,
      body.quaternion.z,
      body.quaternion.w
    );

    let maxDot = -1;
    let faceValue = 1;

    for (let i = 0; i < faceNormals.length; i++) {
      const transformedNormal = faceNormals[i].clone().applyQuaternion(quaternion);
      const dot = transformedNormal.dot(upVector);

      if (dot > maxDot) {
        maxDot = dot;
        faceValue = faceValues[i];
      }
    }

    return faceValue;
  }

  areDiceSettled(): boolean {
    return this.diceBodies.every((body) => body && body.sleepState === CANNON.Body.SLEEPING);
  }

  private startSettlementCheck(): void {
    // Wait 2 seconds before starting to check for settlement
    setTimeout(() => {
      const checkInterval = setInterval(() => {
        if (this.areDiceSettled()) {
          clearInterval(checkInterval);
          this.extractDiceValues();
        }
      }, 100); // Check every 100ms

      // Fallback timeout after 8 more seconds (10 total)
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!this.areDiceSettled()) {
          this.extractDiceValues();
        }
      }, 8000);
    }, 2000);
  }

  private async syncDiceState(): Promise<void> {
    // TODO: Send dice values to backend for multiplayer sync
    // This ensures all players see the same dice results
    if (this.gameId) {
      try {
        // Store dice state in game record or separate table
        console.warn('Syncing dice state to backend:', this.diceValues);
      } catch (error) {
        console.error('Failed to sync dice state:', error);
      }
    }
  }

  private applyDieToBody(body: CANNON.Body, mesh: THREE.Mesh | undefined, die: Die) {
    this.setBodyPose(body, die.position, die.quaternion);
    this.setBodyVelocities(body, die.velocity, die.angularVelocity);
    if (mesh) this.syncMeshWithBody(mesh, body);
  }

  private setBodyPose(body: CANNON.Body, p?: DieVector3, q?: DieQuaternion) {
    if (p) body.position.set(p.x ?? 0, p.y ?? 0, p.z ?? 0);
    if (q) body.quaternion.set(q.x ?? 0, q.y ?? 0, q.z ?? 0, q.w ?? 0);
  }

  private setBodyVelocities(body: CANNON.Body, v?: DieVector3, av?: DieVector3) {
    if (v) body.velocity.set(v.x ?? 0, v.y ?? 0, v.z ?? 0);
    if (av) body.angularVelocity.set(av.x ?? 0, av.y ?? 0, av.z ?? 0);
  }

  private syncMeshWithBody(mesh: THREE.Mesh, body: CANNON.Body) {
    mesh.position.set(body.position.x, body.position.y, body.position.z);
    mesh.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
  }

  getCurrentPlayerName(): string {
    return this.players[this.currentPlayerIndex]?.name || 'Tuntematon';
  }

  getCurrentThrow(): number {
    return Math.min(4 - this.rollsLeft, 3);
  }

  private async isPlayerTurn(): Promise<boolean> {
    if (this.players.length === 1) return true; // Single player mode

    try {
      const user = await this.getUserProfile();
      this.currentUserId = user?.id ?? null;
      const currentPlayer = this.players[this.currentPlayerIndex];
      return currentPlayer?.id === this.currentUserId;
    } catch {
      return false;
    }
  }

  canRoll(): boolean {
    return this.rollsLeft > 0 && this.gameState === 'ongoing' && this.areDiceSettled();
  }

  toggleKeepDie(index: number): void {
    if (!this.areDiceSettled()) {
      return;
    }

    if (this.keptDiceValues.has(index)) {
      this.keptDiceValues.delete(index);
      // Show die in 3D scene again
      this.showDie(index);
    } else {
      this.keptDiceValues.set(index, this.diceValues[index]);
      // Hide die from 3D scene
      this.hideDie(index);
    }
  }

  getKeptDiceArray(): { index: number; value: number }[] {
    return Array.from(this.keptDiceValues.entries()).map(([index, value]) => ({ index, value }));
  }

  private resetTurn(): void {
    this.diceValues = [];
    this.keptDiceValues.clear();
    this.rollsLeft = 3;
    // Show all dice again
    for (let i = 0; i < 6; i++) {
      this.showDie(i);
    }
  }

  private hideDie(index: number): void {
    if (this.diceMeshes[index]) {
      this.diceMeshes[index].visible = false;
    }
  }

  private showDie(index: number): void {
    if (this.diceMeshes[index]) {
      this.diceMeshes[index].visible = true;
    }
  }

  private endTurn(): void {
    this.resetTurn();
    if (this.players.length === 0) return;
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    console.warn(`Seuraava vuoro: ${this.players[this.currentPlayerIndex]?.name}`);
  }

  endTurnWithScore(): void {
    this.calculateScoreOptions();
    this.showScoreSelection = true;
  }

  onScoreRowClick(category: string): void {
    if (this.isCategorySelectable(category)) {
      const score = this.getPotentialScore(category);
      if (score !== null) {
        this.selectScore(category, score);
      }
    }
  }

  selectScore(category: string, score: number): void {
    const currentPlayer = this.players[this.currentPlayerIndex];
    if (!currentPlayer) return;

    // Initialize player scores if not exists
    if (!this.playerScores.has(currentPlayer.id)) {
      this.playerScores.set(currentPlayer.id, new Map());
    }

    const playerScore = this.playerScores.get(currentPlayer.id);
    if (!playerScore) return;
    playerScore.set(category, score);

    // Check for bonus after upper section completion
    this.checkBonus(currentPlayer.id);

    this.showScoreSelection = false;
    this.endTurn();
  }

  private calculateScoreOptions(): void {
    this.scoreOptions = [];
    const currentPlayer = this.players[this.currentPlayerIndex];
    if (!currentPlayer) return;

    const playerScore = this.playerScores.get(currentPlayer.id) ?? new Map();
    const isPhaseOne = this.isPhaseOne(currentPlayer.id);

    const availableCategories = isPhaseOne
      ? this.upperCategories
      : this.scoreCategories.filter(
          (cat) => !this.upperCategories.includes(cat) && cat !== 'Bonus'
        );

    for (const category of availableCategories) {
      if (playerScore.has(category)) continue;

      const score = this.calculateScore(category, this.diceValues);
      this.scoreOptions.push({ category, score });
    }
  }

  private isPhaseOne(playerId: string): boolean {
    const playerScore = this.playerScores.get(playerId) ?? new Map();
    return !this.upperCategories.every((cat) => playerScore.has(cat));
  }

  getVisibleCategories(): string[] {
    const currentPlayer = this.players[this.currentPlayerIndex];
    if (!currentPlayer) return this.scoreCategories;

    const isPhaseOne = this.isPhaseOne(currentPlayer.id);
    const playerScore = this.playerScores.get(currentPlayer.id) ?? new Map();

    if (isPhaseOne) {
      return this.upperCategories.concat(playerScore.has('Bonus') ? ['Bonus'] : []);
    } else {
      return this.scoreCategories;
    }
  }

  private calculateScore(category: string, dice: number[]): number {
    const counts = [0, 0, 0, 0, 0, 0, 0]; // index 0 unused, 1-6 for dice values
    dice.forEach((die) => counts[die]++);

    return this.getScoreForCategory(category, counts, dice);
  }

  private getScoreForCategory(category: string, counts: number[], dice: number[]): number {
    if (this.isNumberCategory(category)) {
      return this.calculateNumberScore(category, counts);
    }

    return this.calculateSpecialScore(category, counts, dice);
  }

  private isNumberCategory(category: string): boolean {
    return ['Ykköset', 'Kakkoset', 'Kolmoset', 'Neloset', 'Vitoset', 'Kutoset'].includes(category);
  }

  private calculateNumberScore(category: string, counts: number[]): number {
    const numberMap: Record<string, number> = {
      Ykköset: 1,
      Kakkoset: 2,
      Kolmoset: 3,
      Neloset: 4,
      Vitoset: 5,
      Kutoset: 6,
    };
    const value = numberMap[category];
    return counts[value] * value;
  }

  private calculateSpecialScore(category: string, counts: number[], dice: number[]): number {
    const pairScore = this.calculatePairScore(category, counts);
    if (pairScore !== null) return pairScore;

    const straightScore = this.calculateStraightScore(category, dice);
    if (straightScore !== null) return straightScore;

    return this.calculateOtherScore(category, counts, dice);
  }

  private calculatePairScore(category: string, counts: number[]): number | null {
    switch (category) {
      case 'Pari':
        return this.findPair(counts);
      case 'Kaksi paria':
        return this.findTwoPairs(counts);
      case 'Kolme paria':
        return this.findThreePairs(counts);
      case 'Kolme samaa':
        return this.findOfAKind(counts, 3);
      case 'Neljä samaa':
        return this.findOfAKind(counts, 4);
      case 'Viisi samaa':
        return this.findOfAKind(counts, 5);
      default:
        return null;
    }
  }

  private calculateStraightScore(category: string, dice: number[]): number | null {
    switch (category) {
      case 'Pieni suora':
        return this.findSmallStraight(dice) ? 15 : 0;
      case 'Iso suora':
        return this.findLargeStraight(dice) ? 20 : 0;
      case 'Täysi suora':
        return this.findFullStraight(dice) ? 25 : 0;
      default:
        return null;
    }
  }

  private calculateOtherScore(category: string, counts: number[], dice: number[]): number {
    switch (category) {
      case 'Täyskäsi':
        return this.findFullHouse(counts);
      case 'Superkäsi':
        return this.findSuperHouse(counts);
      case 'Torni':
        return this.findTower(counts);
      case 'Sattuma':
        return dice.reduce((sum, die) => sum + die, 0);
      case 'Maxi Jatsi':
        return counts.some((count) => count === 6) ? 100 : 0;
      default:
        return 0;
    }
  }

  private findPair(counts: number[]): number {
    for (let i = 6; i >= 1; i--) {
      if (counts[i] >= 2) return i * 2;
    }
    return 0;
  }

  private findTwoPairs(counts: number[]): number {
    const pairs = [];
    for (let i = 6; i >= 1; i--) {
      if (counts[i] >= 2) pairs.push(i);
    }
    return pairs.length >= 2 ? (pairs[0] + pairs[1]) * 2 : 0;
  }

  private findThreePairs(counts: number[]): number {
    const pairs = [];
    for (let i = 6; i >= 1; i--) {
      if (counts[i] >= 2) pairs.push(i);
    }
    return pairs.length >= 3 ? (pairs[0] + pairs[1] + pairs[2]) * 2 : 0;
  }

  private findOfAKind(counts: number[], needed: number): number {
    for (let i = 6; i >= 1; i--) {
      if (counts[i] >= needed) return i * needed;
    }
    return 0;
  }

  private findSmallStraight(dice: number[]): boolean {
    const unique = [...new Set(dice)].sort((a, b) => a - b);
    return [1, 2, 3, 4, 5].every((n) => unique.includes(n));
  }

  private findLargeStraight(dice: number[]): boolean {
    const unique = [...new Set(dice)].sort((a, b) => a - b);
    return [2, 3, 4, 5, 6].every((n) => unique.includes(n));
  }

  private findFullStraight(dice: number[]): boolean {
    const unique = [...new Set(dice)].sort((a, b) => a - b);
    return unique.length === 6 && unique.every((n, i) => n === i + 1);
  }

  private findFullHouse(counts: number[]): number {
    let hasThree = false,
      hasTwo = false;
    for (let i = 1; i <= 6; i++) {
      if (counts[i] === 3) hasThree = true;
      if (counts[i] === 2) hasTwo = true;
    }
    return hasThree && hasTwo ? 25 : 0;
  }

  private findSuperHouse(counts: number[]): number {
    return counts.some((count) => count === 4) && counts.some((count) => count === 2) ? 30 : 0;
  }

  private findTower(counts: number[]): number {
    return counts.some((count) => count === 5) ? 35 : 0;
  }

  private checkBonus(playerId: string): void {
    const playerScore = this.playerScores.get(playerId);
    if (!playerScore) return;

    const upperSum = this.upperCategories.reduce((sum, cat) => {
      return sum + (playerScore.get(cat) ?? 0);
    }, 0);

    const allUpperFilled = this.upperCategories.every((cat) => playerScore.has(cat));

    if (allUpperFilled && upperSum >= 75 && !playerScore.has('Bonus')) {
      playerScore.set('Bonus', 50);
    }
  }

  getPlayerScore(playerId: string, category: string): number | null {
    return this.playerScores.get(playerId)?.get(category) ?? null;
  }

  getCurrentPlayerScore(category: string): number | null {
    const currentPlayer = this.players[this.currentPlayerIndex];
    return currentPlayer ? this.getPlayerScore(currentPlayer.id, category) : null;
  }

  toggleScoreView(): void {
    this.showAllPlayers = !this.showAllPlayers;
  }

  getPlayerTotalScore(playerId: string): number {
    const playerScore = this.playerScores.get(playerId);
    if (!playerScore) return 0;

    return Array.from(playerScore.values()).reduce((sum, score) => sum + score, 0);
  }

  getLeaderboard(): { player: Player; totalScore: number }[] {
    return this.players
      .map((player) => ({
        player,
        totalScore: this.getPlayerTotalScore(player.id),
      }))
      .sort((a, b) => b.totalScore - a.totalScore);
  }

  isCategorySelectable(category: string): boolean {
    if (!this.showScoreSelection) return false;
    const currentPlayer = this.players[this.currentPlayerIndex];
    if (!currentPlayer) return false;

    const playerScore = this.playerScores.get(currentPlayer.id) ?? new Map();
    return !playerScore.has(category) && this.scoreOptions.some((opt) => opt.category === category);
  }

  getPotentialScore(category: string): number | null {
    if (!this.showScoreSelection) return null;
    const option = this.scoreOptions.find((opt) => opt.category === category);
    return option ? option.score : null;
  }
}
