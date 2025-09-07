import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { postConfirmation } from '../auth/post-confirmation/resource';
import { cleanupEmptyGames } from '../functions/cleanup-empty-games/resource';
import { endTurn } from '../functions/end-turn/resource';
import { getScores } from '../functions/get-scores/resource';
import { throwDice } from '../functions/throw-dice/resource';

// Define score types enum once for reuse
const scoreTypesEnum = a.enum([
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
]);

const schema = a
  .schema({
    Game: a
      .model({
        name: a.string().required(),
        hostedBy: a.string().required(),
        state: a.enum(['joinable', 'ongoing', 'finished']),
        users: a.hasMany('User', 'gameId'),
        scoreSheet: a.hasMany('ScoreSheet', 'gameId'),
        whosTurnId: a.string(),
        whosTurn: a.belongsTo('User', 'whosTurnId'),
        turnNumber: a.enum(['first', 'second', 'third']),
      })
      .secondaryIndexes((index) => [index('state')])
      .authorization((allow) => [allow.authenticated().to(['create', 'read']), allow.owner()]),
    User: a
      .model({
        profileOwner: a.string(),
        name: a.string().required(),
        gameId: a.string(),
        game: a.belongsTo('Game', 'gameId'),
        gameTurn: a.hasOne('Game', 'whosTurnId'),
        scores: a.hasMany('Score', 'userId'),
      })
      .secondaryIndexes((index) => [index('profileOwner')])
      .authorization((allow) => [allow.ownerDefinedIn('profileOwner')]),
    ScoreType: a.customType({
      type: scoreTypesEnum,
    }),
    Score: a
      .model({
        typeId: a.id().required(),
        type: a.ref('ScoreType'),
        value: a.integer(),
        userId: a.id().required(),
        user: a.belongsTo('User', 'userId'),
        scoreSheetId: a.id().required(),
        scoreSheet: a.belongsTo('ScoreSheet', 'scoreSheetId'),
      })
      .authorization((allow) => [allow.authenticated()]),
    ScoreSheet: a
      .model({
        gameId: a.id().required(),
        game: a.belongsTo('Game', 'gameId'),
        score: a.hasMany('Score', 'scoreSheetId'),
      })
      .authorization((allow) => [allow.authenticated()]),
    getScores: a
      .query()
      .arguments({
        diceValues: a.integer().array().required(),
      })
      .returns(a.json())
      .handler(a.handler.function(getScores))
      .authorization((allow) => [allow.authenticated()]),
    DieVector3: a.customType({
      x: a.float(),
      y: a.float(),
      z: a.float(),
    }),
    DieQuaternion: a.customType({
      x: a.float(),
      y: a.float(),
      z: a.float(),
      w: a.float(),
    }),
    Die: a.customType({
      position: a.ref('DieVector3'),
      quaternion: a.ref('DieQuaternion'),
      velocity: a.ref('DieVector3'),
      angularVelocity: a.ref('DieVector3'),
    }),
    ThrowDiceResponse: a.customType({
      gravity: a.ref('DieVector3'),
      groundPosition: a.ref('DieVector3'),
      dice: a.ref('Die').array(),
    }),
    throwDice: a
      .query()
      .arguments({
        numberOfDice: a.integer().required(),
      })
      .returns(a.ref('ThrowDiceResponse'))
      .handler(a.handler.function(throwDice))
      .authorization((allow) => [allow.authenticated()]),
    endTurn: a
      .mutation()
      .arguments({
        scoreType: scoreTypesEnum,
      })
      .returns(a.integer())
      .handler(a.handler.function(endTurn))
      .authorization((allow) => [allow.authenticated()]),
    cleanupEmptyGames: a
      .mutation()
      .arguments({
        gameId: a.string().required(),
      })
      .returns(a.json())
      .handler(a.handler.function(cleanupEmptyGames))
      .authorization((allow) => [allow.authenticated()]),
    Message: a
      .model({
        content: a.string().required(),
        senderName: a.string().required(),
        contextType: a.enum(['lobby', 'game']),
        contextId: a.string(),
        timestamp: a.datetime().required(),
      })
      .authorization((allow) => [allow.authenticated()]),
  })
  .authorization((allow) => [allow.resource(postConfirmation)]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    // This tells the data client in your app (generateClient())
    // to sign API requests with the user authentication token.
    defaultAuthorizationMode: 'userPool',
  },
  logging: true,
});
