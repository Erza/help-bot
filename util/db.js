const mariadb = require('mariadb');
const connections = {};

async function createConnection(db) {
    try {
        return await mariadb.createConnection({host: db.host, user: db.user, password: db.password, database: db.name});
    } catch (err) {
        throw err;
    }
}

async function getConnection(server) {
    if (connections.hasOwnProperty(server.name)) {
        const connection = connections[server.name];
        try {
            await connection.ping();
            return connection;
        } catch (err) {
            console.error(`Connection to server ${server.name} is currently unavailable. Error: ${err}`);
        }
    } else {
        try {
            const connection = await createConnection(server.db);
            connections[server.name] = connection;
            return connection;
        } catch (err) {
            console.error(`Could not create new database connection for server ${server.name}. Error: ${err}`);
        }
    }
}

module.exports = {
    getConnection: getConnection
}
