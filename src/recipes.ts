import { Mithril } from "./node";

export class Recipe {
    private static _knownRecipes = new Map<string, Recipe>();
    public static knownRecipes = new Proxy(this._knownRecipes, {
        get(target, prop, receiver) {
            // Perform the normal non-proxied behavior.
            var value = Reflect.get(target, prop, receiver);

            // Intercept calls to set.
            if (prop === "set" && typeof value === "function") {
                const origSet = value;
                value = function (key: string, value: Recipe) {
                    // Insert and persist on every call to set.
                    let applied = origSet.bind(target).apply(this._knownRecipes, arguments);
                    window.localStorage.setItem('mithril.knownRecipes', JSON.stringify(applied, (key, value) => {
                        if (value instanceof Map) {
                            return {
                                dataType: 'Map',
                                value: Array.from(value.entries()), // or with spread: value: [...value]
                            };
                        } else {
                            return value;
                        }
                    }));

                    let recipeList = document.getElementById('mithril-recipe-selector');
                    if (recipeList) {
                        recipeList.childNodes.forEach(e => { e.remove() });
                        Recipe.renderKnownRecipes().forEach(e => {
                            recipeList.appendChild(e[1]);
                        });
                    }

                    console.log(`Learned Recipe ${JSON.stringify(value)}`)
                    return applied;
                };
            }
            else if (prop === "remove" && typeof value === "function") {
                const origSet = value;
                value = function (key: string) {
                    // Insert and persist on every call to set.
                    let applied = origSet.bind(target).apply(this._knownRecipes, arguments);
                    window.localStorage.setItem('mithril.knownRecipes', JSON.stringify(applied, (key, value) => {
                        if (value instanceof Map) {
                            return {
                                dataType: 'Map',
                                value: Array.from(value.entries()), // or with spread: value: [...value]
                            };
                        } else {
                            return value;
                        }
                    }));

                    let recipeList = document.getElementById('mithril-recipe-selector');
                    if (recipeList) {
                        recipeList.childNodes.forEach(e => { e.remove() });
                        Recipe.renderKnownRecipes().forEach(e => {
                            recipeList.appendChild(e[1]);
                        });
                    }

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
        let kr = window.localStorage.getItem('mithril.knownRecipes');
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
            window.localStorage.setItem('mithril.knownRecipes', kr);
        }
        this._knownRecipes = JSON.parse(kr, (key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (value.dataType === 'Map') {
                    return new Map(value.value);
                }
            }
            return value;
        });
    }

    public displayName: string;
    public get id(): string {
        return this.displayName.toLowerCase().replace(" ", "-");
    }

    public time: number;
    public inputs: Map<string, number>;

    public outputString: string;
    public onComplete: (recipeId: string) => void;

    public canCraft(): boolean {
        return true; // dev
    }

    public renderRequirements(): string {
        let out = `${this.displayName}: {\n  Time: ${this.time}h\n  Inputs: {\n`;
        this.inputs.forEach((amount: number, resource: string) => {
            out += `    ${resource}: ${amount.toString()}\n`;
        });
        out += `  },\n  Outputs: ${this.outputString}\n}`
        return out;
    }

    public learn() {
        Recipe.knownRecipes.set(this.id, this);
    }

    public complete() {
        this.onComplete(this.id);
    }

    public static forget(id: string): Recipe | undefined {
        if (Recipe.knownRecipes.has(id)) {
            let old = Recipe.knownRecipes.get(id);
            Recipe.knownRecipes.delete(id);
            return old;
        }
    }

    public static renderKnownRecipes(): [Recipe, HTMLOptionElement][] {
        let options: [Recipe, HTMLOptionElement][] = [];

        for (const value of this.knownRecipes.values()) {
            let opt = document.createElement('option');
            opt.value = value.id;
            opt.textContent = value.displayName;
            options.push([value, opt]);
        }

        return options;
    }

    /**
     * 
     * @param displayName 
     * @param time in msec
     * @param inputs 
     */
    public constructor(displayName: string, time: number, inputs: Map<string, number>, outputString: string, onComplete: (recipeId: string) => void) {
        this.displayName = displayName;
        this.time = time;
        this.inputs = inputs;
        this.outputString = outputString;
        this.onComplete = onComplete;
    }
}

/**
 * Returns a random number between min (inclusive) and max (exclusive)
 */
function rand(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}

export const Recipes = {
    refineScrap: new Recipe("Refine Scrap", 5000, new Map([
        ["Scrap", 1],
    ]), 
    `{\n    Steel: 2-5,\n    Electronics: 1\n  }`,
    (id: string) => {
        Mithril.currentResources.set("Steel", Mithril.currentResources.get("Steel") + rand(2, 6));
        Mithril.currentResources.set("Electronics", Mithril.currentResources.get("Electronics") + 1);
    }),
}