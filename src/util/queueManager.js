const fs = require('node:fs');
const path = require('node:path');
const { stringify } = require('node:querystring');

const localCachePath = path.join(__dirname.replace('src', 'res').replace('util', ''), 'local_cache')

module.exports = {
    getQueue(serverId) {
        const localCacheFilePath = path.join(localCachePath, serverId + '.json')	
        const localCacheFile = require(localCacheFilePath)

        return localCacheFile.queue
    },
    async addToQueue(serverId, videoUrl) {
        const localCacheFilePath = path.join(localCachePath, serverId + '.json')
        const localCacheFile = require(localCacheFilePath)

        localCacheFile.queue.push(videoUrl)
        fs.writeFileSync(localCacheFilePath, `{"queue": "${localCacheFile.queue}", "looping": "${localCacheFile.looping}", "queue_looping": "${localCacheFile.queue_looping}"}`)
        
        console.log(require(localCacheFilePath))
    }
}