import { registry } from "../gameRegistry";
import { barbuDef } from "./barbu";
import { heartsDef } from "./hearts";
import { spadesDef } from "./spades";
import { whistDef } from "./whist";

// Register all core games
registry.register("barbu", barbuDef);
registry.register("hearts", heartsDef);
registry.register("whist", whistDef);
registry.register("spades", spadesDef);
