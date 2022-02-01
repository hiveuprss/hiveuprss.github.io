class HoneyComb {
    constructor(domain, user, Optimize){
        this._domain = domain.substr(domain.length-2) === '/' ? domain : `${domain}/`
        this._ready = false
        this._fallbacks = []
        this._user = user || ''
        this.opt = Optimize || true
        this.User = {}
        this.NFTs = {}
        this.FTs = {}
        this.init()
        this.pop_user()
    }
    init(){
        fetch(`${this.domain}api/protocol`).then(res => res.json()).then(res => {
            this.multisig = res.multisig
            this.domain_id = res.node
            this.jsontoken = res.jsontoken
            this.prefix = res.prefix
            this.consensus = res.consensus
            this._ready = true
            this.status = []
            this.nfts_enabled = res.nfts_enabled || true
            if(this.nfts_enabled)this.nfts()
            this.ping(this.consensus)
        })
    }
    refresh(){
        //this.pop_user()
        //this.nfts()
    }
    ping(consensus){
        const now = new Date()
        for(var node in consensus){
            fetch(`${consensus[node].domain.substr(domain.length-2) === '/' ? domain : `${domain}/`}api/protocol`).then(r=>r.json()).then(res=>{
                const ping = new Date() - now
                if(res.node == node){
                    this._fallbacks.push({node,ping,domain:consensus[node].domain.substr(domain.length-2) === '/' ? domain : `${domain}/`})
                }
                if(this._ready.node == this.domain_id){
                    this.ping = ping
                }
            })
        }
        setTimeout(() => {
            this.optimize()
        }, 2000)
    }
    set fallbacks(fallbacks){
        this._fallbacks = fallbacks
    }
    get fallbacks(){
        this._fallbacks.sort((a,b) => a.ping - b.ping)
        return this._fallbacks
    }
    optimize(){
        if(this.opt){
            this._fallbacks.sort((a,b) => a.ping - b.ping)
            this.domain = this._fallbacks[0].domain
        }
    }
    set domain(domain){
        this._domain =  domain.substr(domain.length-2) === '/' ? domain : `${domain}/`
        this._ready = false
        this.init()
    }
    get ready(){
        return this._ready
    }
    get domain(){
        return this._domain
    }
    get vitals(){
        return {
            domain: this.domain,
            domain_id: this.domain_id,
            jsontoken: this.jsontoken,
            prefix: this.prefix,
            multisig: this.multisig,
            ping: this.ping,
            fallbacks: this._fallbacks,
            ready: this._ready
        }
    }
    pop_user(){
        return new Promise((resolve, reject) => {
            fetch(`${this.domain}@${this._user}`).then(r => r.json()).then(r => {
                this.User = r
                resolve(r)
            })
            .catch(e=>reject(e))
        })
    }
    get user(){
        return this.User
    }
    nfts(){
        return new Promise((resolve, reject) => {
            fetch(`${this.domain}api/nfts/${this._user}`).then(r => r.json()).then(r => {
                delete this.NFTs
                for(var i = 0; i < r.result.length;i++){
                    this.NFTs[`${r.result[i].set}:${r.result[i].uid}`] = r.result[i]
                }
                for(var i = 0; i < r.mint_tokens.length;i++){
                    this.FTs[r.mint_tokens[i].set] = r.mint_tokens[i]
                }
                resolve(r)
            })
            .catch(e=>reject(e))
        })
    }
    broadcastTransfer(cj, msg){
        return new Promise((resolve, reject) => {
            this.hive_sign([this._user, [
                        ['transfer', {
                            to: this.multisig,
                            from: this._user,
                            amount: `${parseFloat((cj.hive ? cj.hive : cj.hbd)/1000).toFixed(3)} ${cj.hive?'HIVE':'HBD'}`,
                            memo: cj.memo
                        }]
                    ], 'active'])
                .then(r => {
                    this.status.push([r.result.id, new Date(), msg])
                    resolve(r)
                })
                .catch(e => { reject(e) })
            })
    }
    broadcastCJA(cj, id, msg){
        return new Promise((resolve, reject) => {
        this.hive_sign([this._user, [
                        ['custom_json', {
                            "required_auths": [this._user],
                            "required_posting_auths": [],
                            "id": this.prefix + id,
                            "json": JSON.stringify(cj)
                        }]
                    ], 'active'])
                .then(r => {
                    this.status.push([r.result.id, new Date(), msg])
                    resolve(r)
                })
                .catch(e => { reject(e) })
            })
    }
    hive_sign(op) {
         return new Promise((resolve, reject) => {
             if (window.hive_keychain) {
                 try {
                     window.hive_keychain.requestBroadcast(op[0], op[1], op[2], function(response) {
                         resolve(response)
                     });
                 } catch (e) {
                     reject(e)
                 }
             } else {
                 reject({ "error": "Hive Keychain is not installed." })
             }
         })
    }
    status(){
        setTimeout(() => {
            this.status.sort((a,b) => a[1] - b[1])
            for(var i = 0; i < this.status.length;i++){
                if(this.status[i].length == 3){
                    check(this.status[i][0], i)
                }
            }
        }, 30000)
        function check(id, int){
            fetch(this.domain + `api/status/${id}`).then(r => r.json()).then(r => {
                        if(json.status.slice(0,20) != 'This TransactionID e'){
                            this.status[int].push(r.status)
                        }
                    })
        }
    }
}