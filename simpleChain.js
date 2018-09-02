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

class Blockchain {

    constructor() {
        this.getBlockHeight().then(height => {
            if (height === 0) {
                return this.addBlock(new Block('First block in the chain - Genesis block'));
            }
        });
    }

    // Add new block
    async addBlock(newBlock) {
        var height = await this.getBlockHeight();

        // Block height
        newBlock.height = height;

        // UTC timestamp
        newBlock.time = new Date().getTime().toString().slice(0, -3);

        // previous block hash
        if (height > 0) {
            newBlock.previousBlockHash = (await this.getBlock(height - 1)).hash;
        }
        // Block hash with SHA256 using newBlock and converting to a string
        newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();

        // persist block in leveldb
        await db.put(newBlock.height, JSON.stringify(newBlock));
    }

    async getBlockHeight() {
        return new Promise((resolve, reject) => {
            var height = 0;
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
    async getBlock(blockHeight) {
        return JSON.parse(await db.get(blockHeight));
    }

    // validate block
    async validateBlock(blockHeight) {
        // get block object
        let block = await this.getBlock(blockHeight);
        // get block hash
        let blockHash = block.hash;
        // remove block hash to test block integrity
        block.hash = '';
        // generate block hash
        let validBlockHash = SHA256(JSON.stringify(block)).toString();
        // Compare
        if (blockHash === validBlockHash) {
            console.log('Block #' + blockHeight + ' is valid.');
            return true;
        } else {
            console.log('Block #' + blockHeight + ' is invalid hash:\n' + blockHash + '<>' + validBlockHash);
            return false;
        }
    }

    // Validate blockchain
    async validateChain(){
        let errorLog = [];
        var height = await this.getBlockHeight();
        for (var i = 0; i <= height - 1; i++) {
            // validate block
            if (!(await this.validateBlock(i)))errorLog.push(i);

            if (i == height-1) continue;

            // compare blocks hash link
            let blockHash = (await this.getBlock(i)).hash;
            let previousHash = (await this.getBlock(i+1)).previousBlockHash;
            if (blockHash!==previousHash) {
                errorLog.push(i);
            }
        }
        if (errorLog.length>0) {
            console.log('Block errors = ' + errorLog.length);
            console.log('Blocks: '+errorLog);
        } else {
            console.log('No errors detected');
        }
    }
}

console.log('- Test: Blockchain Model -');

const testError = true;

var blockchain = new Blockchain();

(async () => {
    var height = await blockchain.getBlockHeight();

    for(var i = 1; i < 3; i++) {
            await blockchain.addBlock(new Block("Block #" + i));
        }

    await blockchain.validateChain();

    if(testError) {
        console.log('- Induce Test Error -');
        var block = await blockchain.getBlock(1);
        block.data = "Error Data";

        // put directly, otherwise blockchain.addBlock will add this as a new block
        await db.put(block.height, JSON.stringify(block));

        console.log('#Blockchain Error at Block 1:');
        await blockchain.validateChain();
    }
})();
