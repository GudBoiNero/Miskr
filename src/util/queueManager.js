const fs = require('node:fs');
const path = require('node:path');

const localCachePath = path.join(__dirname.replace('src', 'res').replace('util', ''), 'local_cache')

module.exports = {
    getQueue(serverId) {
        const localCacheFilePath = path.join(localCachePath, serverId+'.json')	
        const localCacheFile = require(localCacheFilePath)

        return localCacheFile.queue
    },
    async addToQueue(serverId, videoInfo) {
        
    }
}