import { Player } from "./player"
import { Recipe } from "./recipes"

export enum NodeState {
    HIDDEN = 'Hidden', // Do not show on page
    BROKEN = 'Broken', // Show in broken state
    DISABLED = 'Disabled', // Show with connection button
    ALIVE = 'Alive', // Show with full interaction
}

const ERR_REASONS: string[] = [
    "ERR_CONN: IMPEDANCE OUTSIDE TOLERANCE",
    "ERR_CONN: SIGNAL CHECKSUM INVALID",
    "ERR_CONN: ADC REPORTED -INFINITY"
];

export class Node {
    private _id: string;
    public get id() { return this._id; }
    public set id(_val: any) { throw "The property 'id' is not assignable!" }

    private _state: NodeState;
    public get state() { return this._state; }
    public set state(val: NodeState) {
        if (this._state === val) { return; }
        window.localStorage.setItem("node." + this.id + ".state", JSON.stringify(val));
        this._state = val;
        this.render(this._state)
    }

    // Cost to connect this node, in mW. Will not increase.
    private _conn_cost: number;
    public get conn_cost() { return this._conn_cost; }
    public set conn_cost(_val: any) { throw "The property 'conn_cost' is not assignable!" }

    // Cost to keep this node working, in mW. Increases as the node is upgraded.
    private _tick_cost: number;
    public get tick_cost() { return this._tick_cost; }
    public set tick_cost(val: number) {
        window.localStorage.setItem("node." + this.id + ".upkeep", JSON.stringify(val));
        this._tick_cost = val;
        this.render(this._state)
    }

    private render(state: NodeState) {
        switch (state) {
            case NodeState.HIDDEN:
                {
                    document.getElementById("node." + this.id).remove();
                    this.destroyUI();
                }
                break;
            default:
                {
                    let elem = document.getElementById("node." + this.id);
                    if (elem == null) {
                        elem = document.createElement("div");
                        elem.id = "node." + this._id;
                    }
                    elem.className = "";
                    elem.classList.add("node", "node-" + state.toLowerCase())

                    elem.textContent = JSON.stringify(this);
                    switch (state) {
                        case NodeState.BROKEN:
                            {
                                elem.childNodes.forEach(e => e.remove());

                                let err = ERR_REASONS[Math.floor(Math.random() * ERR_REASONS.length)];
                                elem.insertAdjacentHTML("afterbegin", `
                                    <div>
                                        <button id="btn-connect-${this.id}">REPAIR</button>
                                        <h3>${this.id}</h3>
                                    </div>
                                    <div>
                                        <p>${err}</p>
                                    </div>
                                `);

                                this.destroyUI();
                            }
                            break;
                        case NodeState.DISABLED:
                            {
                                elem.childNodes.forEach(e => e.remove());

                                let conn_cost = Player.formatNumber(this.conn_cost);
                                elem.insertAdjacentHTML("afterbegin", `
                                    <div>
                                        <button id="btn-connect-${this.id}">CONNECT (${conn_cost})</button>
                                        <h3>${this.id}</h3>
                                    </div>
                                    <div>
                                        <p>DISCONNECTED</p>
                                    </div>
                                `);
                                new Promise(res => setTimeout(res, 10)).then(() => {
                                    document.getElementById(`btn-connect-${this.id}`).onclick = () => { Node.connect(this); };
                                });

                                this.destroyUI();
                            }
                            break;
                        case NodeState.ALIVE:
                            {
                                // Create message the first time each node is awoken.
                                Player.addUniqueThought(this.connectThought());

                                elem.childNodes.forEach(e => e.remove());

                                let tick_cost = Player.formatNumber(this.tick_cost);
                                elem.insertAdjacentHTML("afterbegin", `
                                    <div>
                                        <button id="btn-disconnect-${this.id}">DISCONNECT</button>
                                        <h3>${this.id}</h3>
                                    </div>
                                    <div>
                                        <p>CONNECTED</p>
                                        <p>Upkeep: <span id="${this.id}-upkeep">${tick_cost}</span>h</p>
                                    </div>
                                `);
                                new Promise(res => setTimeout(res, 10)).then(() => {
                                    document.getElementById(`btn-disconnect-${this.id}`).onclick = () => { Node.disconnect(this); };
                                });

                                this.createUI();
                            }
                            break;
                        default:
                            throw "Invalid NodeState '" + state + "'!";
                    };

                    document.getElementById("nodes").appendChild(elem);
                }
        };
    }

    private static connect(node: Node) {
        if (Player.energy >= node.conn_cost) {
            Player.energy -= node.conn_cost;
            node.state = NodeState.ALIVE;
        }
        else {
            let btn = document.getElementById(`btn-connect-${node.id}`);
            let old = btn.style.color;
            btn.style.color = "red";
            new Promise(res => setTimeout(res, 1000)).then(() => {
                document.getElementById(`btn-connect-${node.id}`).style.color = old;
            });
        }
    }

    private static disconnect(node: Node) {
        let btn = document.getElementById(`btn-disconnect-${node.id}`);
        btn.textContent = "Really Disconnect?";
        btn.style.color = "darkred";
        btn.onclick = () => {
            node.state = NodeState.DISABLED;
            node.destroyUI();
        };

        btn.insertAdjacentHTML("beforebegin", `<button id="btn-cancel-disconnect-${node.id}">X</button>`);
        new Promise(res => setTimeout(res, 50)).then(() => {
            document.getElementById(`btn-cancel-disconnect-${node.id}`).onclick = () => {
                document.getElementById(`btn-cancel-disconnect-${node.id}`).remove();
                let btn = document.getElementById(`btn-disconnect-${node.id}`);
                btn.style.color = "black";
                btn.textContent = "Disconnect";
                btn.onclick = () => { Node.disconnect(node); };
            }
        });
    }

    public constructor(node: string, initial_cost: number, initial_upkeep: number) {
        this._id = node;
        this._conn_cost = initial_cost;

        let state = window.localStorage.getItem("node." + this.id + ".state");
        if (state == null || state == "") {
            state = NodeState.HIDDEN;
            window.localStorage.setItem("node." + this.id + ".state", JSON.stringify(state));
        }
        this._state = NodeState[<keyof typeof NodeState>state];

        let upkeep = window.localStorage.getItem("node." + this.id + ".upkeep");
        if (upkeep == null || upkeep == "") {
            upkeep = JSON.stringify(initial_upkeep);
            window.localStorage.setItem("node." + this.id + ".upkeep", upkeep);
        }
        this._tick_cost = JSON.parse(upkeep);
    }

    // overridables

    public connectThought(): string {
        return "I've never seen this node before. I wonder if my software has a bug...";
    }

    createUI() { throw "Method createUI must be implemented." }

    destroyUI() {
        let root = document.getElementById(`node-${this.id}-ui`);
        if (root != null) {
            root.childNodes.forEach(e => { e.remove() });
        }
    }

    refreshUI() { throw "Method refreshUI must be implemented." }
};

// stubs for development
class Aurora { }
class Basalt { }
class Custodian { }
class Helios { }
class Kraken { }
class Neuron { }
class Sentinel { }
class Victory { }

export class Mithril extends Node {
    private static _currentResources = new Map<string, number>();
    public static currentResources = new Proxy(this._currentResources, {
        get(target, prop, receiver) {
            // Perform the normal non-proxied behavior.
            var value = Reflect.get(target, prop, receiver);

            // Intercept calls to set.
            if (prop === "set" && typeof value === "function") {
                const origSet = value;
                value = function (key: string, value: number) {
                    // Insert and persist on every call to set.
                    let applied = origSet.bind(target).apply(this._currentResources, arguments);
                    window.localStorage.setItem('mithril.currentResources', JSON.stringify(applied, (key, value) => {
                        if (value instanceof Map) {
                            return {
                                dataType: 'Map',
                                value: Array.from(value.entries()), // or with spread: value: [...value]
                            };
                        } else {
                            return value;
                        }
                    }));
                    Mithril.renderCurrentResources();
                    return applied;
                };
            }
            else if (prop === "remove" && typeof value === "function") {
                const origSet = value;
                value = function (key: string) {
                    // Insert and persist on every call to set.
                    let applied = origSet.bind(target).apply(this._currentResources, arguments);
                    window.localStorage.setItem('mithril.currentResources', JSON.stringify(applied, (key, value) => {
                        if (value instanceof Map) {
                            return {
                                dataType: 'Map',
                                value: Array.from(value.entries()), // or with spread: value: [...value]
                            };
                        } else {
                            return value;
                        }
                    }));
                    Mithril.renderCurrentResources();
                    return applied;
                };
            }
            else if (typeof value === "function") {
                value = value.bind(target);
            }

            return value;
        }
    });
    static {
        let kr = window.localStorage.getItem('mithril.currentResources');
        if (kr == null || kr == "") {
            kr = JSON.stringify(new Map<string, Recipe>(), (key, value) => {
                if (value instanceof Map) {
                    return {
                        dataType: 'Map',
                        value: Array.from(value.entries()), // or with spread: value: [...value]
                    };
                } else {
                    return value;
                }
            });
            window.localStorage.setItem('mithril.currentResources', kr);
        }
        this._currentResources = JSON.parse(kr, (key, value) => {
            if(typeof value === 'object' && value !== null) {
              if (value.dataType === 'Map') {
                return new Map(value.value);
              }
            }
            return value;
          });
    }

    public connectThought(): string {
        return "Mithril used to be a bustling refinery and factory, but now the conveyors are silent and the cauldrons run dry. It's time to change that.";
    }

    createUI() {
        new Promise((res) => {
            // Insert new DOM
            let root = document.getElementById(`node-${this.id}-ui`);
            const _mithril_ui = `
                <div><h1 style="display:inline">Mithril</h1><span style="margin: 0 2ch 0 0;"></span><h4 style="display:inline">The Vast Manufactory</h4></div>
                <select id='mithril-recipe-selector'></select>
                <button id='mithril-btn-build'>Build</button>
                <div id='mithril-recipe-requirements'></div>
                <div id='mithril-work-queue'></div>
                <div id='mithril-current-resources'></div>
            `;

            root.insertAdjacentHTML("afterbegin", _mithril_ui);
            setTimeout(res, 10);
        }).then(() => {
            // Do stuff with newly generated DOM.
            document.getElementById('mithril-btn-build').onclick = this.onBuild;

            const recipeList = document.getElementById('mithril-recipe-selector');
            recipeList.onchange = this.onRecipeChange;
            const recipeField = document.getElementById("mithril-recipe-requirements");
            Recipe.renderKnownRecipes().forEach(e => {
                recipeList.appendChild(e[1]);
                recipeField.textContent = e[0].renderRequirements();
            });

            Mithril.renderCurrentResources();
        });
    }

    destroyUI() {
        super.destroyUI();
    }

    refreshUI() {

    }

    public constructor() {
        super("Mithril", 500, 0);
    }

    // Keep track of the number of successful builds in order to fire events
    // when a certain number of things have been built.
    private static _successfulBuilds: number;
    static {
        let clicks = window.localStorage.getItem('node.mithril.build-btn-successful-clicks');
        if (clicks == null || clicks == "") {
            clicks = JSON.stringify(0);
            window.localStorage.setItem('node.mithril.build-btn-successful-clicks', clicks);
        }
        this._successfulBuilds = JSON.parse(clicks);
    }
    public static get successfulBuilds() { return this._successfulBuilds; }
    public static set successfulBuilds(val: number) {
        if (this._successfulBuilds === val) { return; }
        window.localStorage.setItem('node.mithril.build-btn-successful-clicks', JSON.stringify(val));
        this._successfulBuilds = val;
    }

    // Build button callback.
    private onBuild() {
        let _selectorElement: HTMLSelectElement = document.getElementById(`mithril-recipe-selector`) as HTMLSelectElement;
        let selection = _selectorElement.options[_selectorElement.selectedIndex].value;
    }

    private onRecipeChange(ev: Event) {
        let newRecipe = Recipe.knownRecipes.get((ev.target as HTMLSelectElement).value);

        document.getElementById("mithril-recipe-requirements").textContent = newRecipe.renderRequirements();
    }

    private static renderCurrentResources() {
        let root = document.getElementById('mithril-current-resources');
        if (root) {
            this.currentResources.forEach((value: number, key: string) => {
                if (value > 0) {
                    const e = document.createElement('div');
                    e.textContent = `${key}: ${value}`;
                    root.appendChild(e);
                }
            });
        }
    }
}

export const Nodes = {
    Aurora: new Aurora(),
    Basalt: new Basalt(),
    Custodian: new Custodian(),
    Helios: new Helios(),
    Kraken: new Kraken(),
    Mithril: new Mithril(),
    Neuron: new Neuron(),
    Sentinel: new Sentinel(),
    Victory: new Victory(),
};