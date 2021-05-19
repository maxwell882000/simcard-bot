module.exports = {
    getSession: async function (db, id) {
        let data = await db.get('sessions').getById(id).value()
        return data.data
    },
    saveSession: async function (db, id, session) {
        return db.get('sessions').updateById(id, { data: session }).write()
    }
}