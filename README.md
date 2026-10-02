# Mitho

Food delivery web app for customers and restaurants — browse kitchens, place orders, and run a kitchen desk in one app.

## Stack

- HTML, CSS, JavaScript
- Node.js + Express
- MongoDB (Mongoose)

## Run locally

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

## MongoDB

Paste your connection string into `mongo.uri` (one line, not committed):

```
mongodb+srv://USER:PASSWORD@cluster.mongodb.net/mitho?retryWrites=true&w=majority
```

Restart the server. Without a URI, the app runs with temporary in-memory data.

## Demo logins

Password for demo accounts: `mitho123`

| Role | Email |
|------|--------|
| Customer | aarav@mitho.com |
| Restaurant | kitchen@momohouse.com |
