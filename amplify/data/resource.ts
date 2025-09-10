import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
// Temporarily removing function imports
// import { cleanupEmptyGames } from '../functions/cleanup-empty-games/resource';
// import { endTurn } from '../functions/end-turn/resource';
// import { getScores } from '../functions/get-scores/resource';
// import { throwDice } from '../functions/throw-dice/resource';

// Define score types enum once for reuse
const scoreTypesEnum = a.enum([
  'YKKOSET',
  'KAKKOSET', 
  'KOLMOSET',
  'NELOSET',
  'VIITOSET',
  'KUUTOSET',
  'BONUS',
  'PARI',
  'KAKSI_PARIA',
  'KOLME_PARIA', 
  'KOLME_SAMAA',
  'NELJA_SAMAA',
  'VIISI_SAMAA',
  'PIENI_SUORA',
  'ISO_SUORA',
  'TAYSI_SUORA',
  'TAYSKASI',
  'SUPERKASI',
  'TORNI',
  'SATTUMA',
  'MAKSIJATSI',
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
        guestAccessEnabled: a.boolean().default(true),
      })
      .secondaryIndexes((index) => [index('state')])
      .authorization((allow) => [allow.publicApiKey()]),
    User: a
      .model({
        profileOwner: a.string(),
        name: a.string().required(),
        gameId: a.string(),
        game: a.belongsTo('Game', 'gameId'),
        gameTurn: a.hasOne('Game', 'whosTurnId'),
        scores: a.hasMany('Score', 'userId'),
        isGuest: a.boolean().default(false),
        guestId: a.string(),
      })
      .secondaryIndexes((index) => [index('profileOwner'), index('guestId')])
      .authorization((allow) => [allow.publicApiKey()]),
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
      .authorization((allow) => [allow.publicApiKey()]),
    ScoreSheet: a
      .model({
        gameId: a.id().required(),
        game: a.belongsTo('Game', 'gameId'),
        score: a.hasMany('Score', 'scoreSheetId'),
      })
      .authorization((allow) => [allow.publicApiKey()]),





    Message: a
      .model({
        content: a.string().required(),
        senderName: a.string().required(),
        contextType: a.enum(['lobby', 'game']),
        contextId: a.string(),
        timestamp: a.datetime().required(),
        ttl: a.integer(),
      })
      .authorization((allow) => [allow.publicApiKey()]),
  })
  .authorization((allow) => [allow.publicApiKey()]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
  },
  logging: true,
});