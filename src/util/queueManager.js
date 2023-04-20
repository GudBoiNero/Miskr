const fs = require('node:fs');
const path = require('node:path');
const consoleColors = require('../util/consoleColors');

const localCachePath = path.join(__dirname.replace('src', 'res').replace('util', ''), 'local_cache')

module.exports = {
    getQueue(serverId) {
        const localCacheFilePath = path.join(localCachePath, serverId + '.json')	
        const localCacheFile = require(localCacheFilePath)

        return localCacheFile.queue
    },
    getFirstInQueue(serverId) {
        const firstInQueue = this.getQueue(serverId)[0]
        if (firstInQueue == undefined) {
            console.log(consoleColors.FG_RED+"[queueManager.js]: Failed to find first in queue. Queue is uninitialized.")
            return
        }
        return firstInQueue
    },
    async addToQueue(serverId, videoId) {
        const localCacheFilePath = path.join(localCachePath, serverId + '.json')
        const localCacheFile = require(localCacheFilePath)

        localCacheFile.queue.push(videoId)
        fs.writeFileSync(localCacheFilePath, `{"queue": "${localCacheFile.queue}", "looping": "${localCacheFile.looping}", "queue_looping": "${localCacheFile.queue_looping}"}`)
    }
}