import { registry } from "./gameRegistry";
import { barbuDef } from "./barbu";
import { heartsDef } from "./hearts";
import { spadesDef } from "./spades";
import { whistDef } from "./whist";
import { bridgeDef } from "./bridge";
import { cardCountingDef } from "./cardCounting";
import { ginRummyDef } from "./ginRummy";
import { canastaDef } from "./canasta";
import { euchreDef } from "./euchre";
import { cribbageDef } from "./cribbage";

// Register all core games
registry.register("barbu", barbuDef);
registry.register("hearts", heartsDef);
registry.register("whist", whistDef);
registry.register("spades", spadesDef);
registry.register("bridge", bridgeDef);
registry.register("card-counting", cardCountingDef);
registry.register("gin-rummy", ginRummyDef);
registry.register("canasta", canastaDef);
registry.register("euchre", euchreDef);
registry.register("cribbage", cribbageDef);
