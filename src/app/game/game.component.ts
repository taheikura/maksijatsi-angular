import { Component, ElementRef, ViewChild, OnInit, inject } from '@angular/core';
import { Location } from '@angular/common';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css'],
})
export class GameComponent implements OnInit {
  @ViewChild('canvas', { static: true })
  private readonly canvasRef!: ElementRef<HTMLCanvasElement>;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private world!: CANNON.World;
  private diceBody!: CANNON.Body;

  private currentPlayerIndex = 0;
  private readonly players: string[] = ['Player 1', 'Player 2']; // Example players

  private readonly _location = inject(Location);

  backClicked() {
    this._location.back();
  }

  ngOnInit(): void {
    this.initThreeJS();
    this.animate();
  }

  private initThreeJS(): void {
    // Set up the scene
    this.scene = new THREE.Scene();

    // Set up the camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(5, 10, 10);
    this.camera.lookAt(0, 0, 0);

    // Set up the renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    document.body.appendChild(this.renderer.domElement);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x606060); // Soft white light
    this.scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 30, 5);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    // Add a ground plane
    const groundGeometry = new THREE.PlaneGeometry(30, 30);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x9b5523 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Add a placeholder dice
    const diceGeometry = new THREE.BoxGeometry(1, 1, 1);
    const diceMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const dice = new THREE.Mesh(diceGeometry, diceMaterial);
    dice.castShadow = true;
    dice.position.set(0, 1, 0);
    this.scene.add(dice);

    // Initialize the physics world
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });

    // Create a ground plane in the physics world
    const groundBody = new CANNON.Body({
      mass: 0, // Static body
      shape: new CANNON.Plane(),
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(groundBody);

    // Create a dice body in the physics world
    const diceShape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
    this.diceBody = new CANNON.Body({
      mass: 1, // Dynamic body
      shape: diceShape,
      position: new CANNON.Vec3(0, 5, 0),
    });
    this.world.addBody(this.diceBody);
  }

  private readonly animate = (): void => {
    requestAnimationFrame(this.animate);

    // Step the physics world
    this.world.step(1 / 60);

    // Sync the dice's position and rotation with the Three.js mesh
    const dice = this.scene.children.find(
      (child) => child instanceof THREE.Mesh && child.geometry instanceof THREE.BoxGeometry
    ) as THREE.Mesh;
    if (dice) {
      dice.position.copy(
        new THREE.Vector3(
          this.diceBody.position.x,
          this.diceBody.position.y,
          this.diceBody.position.z
        )
      );
      dice.quaternion.copy(
        new THREE.Quaternion(
          this.diceBody.quaternion.x,
          this.diceBody.quaternion.y,
          this.diceBody.quaternion.z,
          this.diceBody.quaternion.w
        )
      );
    }

    this.renderer.render(this.scene, this.camera);
  };

  rollDice(): void {
    if (this.isPlayerTurn()) {
      console.warn(`${this.players[this.currentPlayerIndex]} is rolling the dice.`);
      const force = new CANNON.Vec3(
        (Math.random() - 0.5) * 10,
        Math.random() * 10,
        (Math.random() - 0.5) * 10
      );
      this.diceBody.applyImpulse(force, new CANNON.Vec3(0, 0, 0));
      this.endTurn();
    } else {
      console.warn(`It's not your turn!`);
    }
  }

  private isPlayerTurn(): boolean {
    // Logic to check if it's the current player's turn
    return this.currentPlayerIndex === 0; // Example logic
  }

  private endTurn(): void {
    // Move to the next player's turn
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    console.warn(`Next turn: ${this.players[this.currentPlayerIndex]}`);
  }
}
