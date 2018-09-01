// In Progress //

/* ===== SHA256 with Crypto-js ===============================
|  Learn more: Crypto-js: https://github.com/brix/crypto-js  |
|  =========================================================*/

const SHA256 = require('crypto-js/sha256');

/* ===== Persist data with LevelDB ===================================
|  Learn more: level: https://github.com/Level/level     |
|  =============================================================*/

const level = require('level');
const chainDB = './chaindata';
const db = level(chainDB);

/* ===== Block Class ==============================
|  Class with a constructor for block 			   |
|  ===============================================*/

class Block{
    constructor(data){
        this.hash = "",
            this.height = 0,
            this.body = data,
            this.time = 0,
            this.previousBlockHash = ""
    }
}
/* ===== Blockchain Class ==========================
|  Class with a constructor for new blockchain 		|
|  ================================================*/

class Blockchain{
    /*
    constructor(){
        this.getBlockHeight().then(height => {
                if (height === 0) {
                    return this.addBlock(new Block('First block in the chain - Genesis block'));
                }
            });
    }
*/
    // Add new block
    async addBlock(newBlock){
        var height = await this.getBlockHeight()+1;

        // Block height
        newBlock.height = height;
        // UTC timestamp
        newBlock.time = new Date().getTime().toString().slice(0,-3);

        // previous block hash
        if(height>0){
            newBlock.previousBlockHash = (await this.getBlock(height-1)).hash;
        }
        // Block hash with SHA256 using newBlock and converting to a string
        newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();

        // persist block in leveldb
        await db.put(newBlock.height, JSON.stringify(newBlock));
    }

    async getBlockHeight() {
        return new Promise((resolve, reject) => {
            var height = -1;
            db.createReadStream()
                .on('data', () => {
                    height++;
                })
                .on('error', err => {
                    console.log('Unable to read data stream!', err);
                    reject(err);
                })
                .on('close', () => {
                    resolve(height);
                });
        });
    }

    // get block
    async getBlock(blockHeight){
        return JSON.parse(await db.get(blockHeight));
    }

    // validate block
    async validateBlock(blockHeight){
        // get block object
        let block = await this.getBlock(blockHeight);
        // get block hash
        let blockHash = block.hash;
        // remove block hash to test block integrity
        block.hash = '';
        // generate block hash
        let validBlockHash = SHA256(JSON.stringify(block)).toString();
        // Compare
        if (blockHash===validBlockHash) {
            console.log('Block #'+blockHeight+' is valid.');
            return true;
        } else {
            console.log('Block #'+blockHeight+' is invalid hash:\n'+blockHash+'<>'+validBlockHash);
            return false;
        }
    }
