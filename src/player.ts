export class Player {
    // Energy value in milliwatts.
    private static _energy: number = null;

    public static get energy() { 
        if(Player._energy == null) {
            let e = JSON.parse(window.localStorage.getItem("player.energy"));
            if(e == null) {
                Player.energy = 982;
            }
        }
        return Player._energy; 
    }
    public static set energy(val: number) {
        window.localStorage.setItem("player.energy", JSON.stringify(val));
        Player._energy = val;

        document.getElementById("energy").textContent = Player.formatNumber(Player._energy);
    }

    public static formatNumber(n: number): string {
        if(n == null) {
            return "NULL mW";
        }

        const ranges = [
            { divider: 1e21, suffix: 'EW' },
            { divider: 1e18, suffix: 'PW' },
            { divider: 1e15, suffix: 'TW' },
            { divider: 1e12, suffix: 'GW' },
            { divider: 1e9, suffix: 'MW' },
            { divider: 1e6, suffix: 'kW' },
            { divider: 1e3, suffix: 'W'}
        ];

        for (var i = 0; i < ranges.length; i++) {
            if (n >= ranges[i].divider) {
                return (n / ranges[i].divider).toString() + ranges[i].suffix;
            }
        }
        return n.toString() + "mW";
    }

    public static addThought(msg: string) {
        const CONTAINER = document.getElementById("thoughts-log");
    
        let node = document.createElement("p");
        node.textContent = msg;
        CONTAINER.appendChild(node);
    
        CONTAINER.scrollTo(0, CONTAINER.scrollHeight);
    }

    private static thoughtCache = new Set();
    public static addUniqueThought(msg: string) {
        if(this.thoughtCache.has(msg)) {
            return;
        }

        this.thoughtCache.add(msg);
        this.addThought(msg);
    }
}