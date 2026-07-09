# Battleship Exam Project

## Server-side

### HTTP APIs
- `GET /api/session`: returns the current logged-in user or null.
```
Response Body if user is  logged:
{
  "user": {
    "id": 1,
    "username": "alice",
    "name": "Alice Blue"
  }
}
else:
{
  "user": null
}
```
- `POST /api/login`: logs in with Passport local strategy using `username` and `password`.
```
Request body:

{
    "username":"alice",
    "password":"password"

}

Description: Logs in the user.

Response: 201 Created (user) or 401 Not authorized.

Response body:

{
  "user": {
    "id":1,
    "username":"alice",
    "name":"Alice Blue"
  }
}

Failure:

401 Unauthorized

```
- `POST /api/logout`: ends the current session.

- `GET /api/difficulties`: returns the supported difficulty levels, grid sizes, ship lists, and torpedo counts.:
```
Response body:

[
  {
    "name":"Easy",
    "size":5,
    "ships":[2,2,2],
    "torpedoes":10
  },
  {
    "name":"Intermediate",
    ...
  },
  {
    "name":"Hard",
    ...
  }
]

```
- `POST /api/matches`: creates a new casual or tournament match. Body: `difficulty`, `mode`, optional `tournamentCode`.:
```
method: 'POST',
Request Body: 
Casual Game:

{
          "difficulty": String,
          "mode": String,
          "tournamentCode": String or null,    
}

Response :201 Created

Response Body

{
    "id":"A93F5C2D",
    "mode":"casual",
    "tournamentCode":null,
    "difficulty":"Easy",
    "size":5,
    "torpedoes":10,
    "initialTorpedoes":10,
    "ships":[
        {
            "id":0,
            "length":2,
            "sunk":false
        }
    ],
    "shots":[],
    "status":"playing",
    "reveal":null
}
``` 
- `GET /api/matches/:id`: returns the current public match state.:
```

Response Body

{
    "id":String,
    "mode":String,
    "tournamentCode":null,  
    "difficulty":String,
    "size":Int,
    "torpedoes":Int,
    "ships":[
        {
            "id": Int,
            "length": Int,
            "sunk":Boolean
        }
    ],
    "shots":[],
    "status":String,
    "reveal":[];
}
``` 
- `POST /api/matches/:id/shots`: launches a torpedo at `row` and `col`.:
```
Request Body:
{
    "row":2,
    "col":4
}

Response Body:
{
"shot": {
    "row":2,
    "col":4,
    "result":"hit",
    "shipId":1,
    "sunkLength":null
  },

  "status":"playing",

  "match":{
      ...
  }
}
```
- `GET /api/stats`: public leaderboard and per-user statistics.:

```
Response Body:
[
  {
    "username": "alice",
    "name": "Alice Blue",
    "difficulty": "Easy",
    "played": 3,
    "won": 2,
    "lost": 1,
    "winRate": 67
  },
  {
    "username": "alice",
    "name": "Alice Blue",
    "difficulty": "Hard",
    "played": 1,
    "won": 1,
    "lost": 0,
    "winRate": 100
  },
  {
    "username": "bruno",
    "name": "Bruno Red",
    "difficulty": "Intermediate",
    "played": 2,
    "won": 0,
    "lost": 2,
    "winRate": 0
  }
]
```

### Database tables
- `users`: registered users with salted password hashes.
- `tournaments`: tournament codes, difficulty, seed, and creator.
- `matches`: stored matches, current state, result, and timestamps.

## Client-side

### Routes
- `/`: main play screen with match setup and board.
- `/login`: login screen for seeded users.
- `/stats`: public statistics page visible without login.

### Main components
- `App`: top-level shell and route switch.
- `LoginPage`: login form.
- `PlayPage`: match creation and game view.
- `Board`: clickable grid of cells.
- `StatsPage`: public statistics table.

## Overall

### Screenshot
![image](img\Screenshot-BattleShipExam.png)

### Seeded users
- `alice / password`
- `bruno / password`
- `carla / password`

### AI usage
- AI was used to help draft and organize the implementation and documentation. The code was verified by reading the source carefully and checking the app structure against the assignment requirements.