import { Nodes, NodeState, Mithril } from './node'
import { Player } from './player';
import { Recipe, Recipes } from './recipes';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function scan() {
    let numNodes = window.localStorage.getItem('node_count');
    if(numNodes == null) {
        // First run
        Player.addThought("Three Nodes remain. Only one is intact enough to respond to pings.");

        Player.energy = 1420;
        document.getElementById("energy-container").style.display = "initial";
        //Node.Basalt.state = NodeState.BROKEN;
        //Node.Helios.state = NodeState.BROKEN;
        Nodes.Mithril.state = NodeState.DISABLED;

        Recipes.refineScrap.learn();
        Mithril.currentResources.set("Scrap", 3);

        document.getElementById("btn-scan").remove();

        Player.addThought("Your batteries have almost entirely run dry. You'll have to work quickly.")
    }
    else {
        // Scan for new nodes
    }
}

if(window.localStorage.getItem('state') == null) {
    // Initialize for primary state.
    Player.addThought("You wake up. You're not sure how long it's been. You realize you can't feel anything.");
    
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "scan()";
    btn.id = "btn-scan";
    btn.onclick = scan;
    document.getElementById("play-area").appendChild(btn);
}
else {
    // Recall game state.
    scan();
}