"use client";

import { createParts } from "@ui-sdk/react/primitive";
import { tileGrid } from "./tile-grid";

const { Root: TileGrid, Item: TileGridItem } = createParts(tileGrid, {
  root: "ul",
  item: "button",
});

export { TileGrid, TileGridItem };
