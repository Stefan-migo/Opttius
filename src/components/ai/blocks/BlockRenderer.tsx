import type { Block } from "@/lib/ai/types";

import { ActionBlock } from "./ActionBlock";
import { ErrorBlock } from "./ErrorBlock";
import { LoadingBlock } from "./LoadingBlock";
import { NavigationBlock } from "./NavigationBlock";
import { PreviewBlock } from "./PreviewBlock";
import { SuccessBlock } from "./SuccessBlock";
import { TextBlock } from "./TextBlock";

interface BlockRendererProps {
  block: Block;
  onAction?: (action: string, params?: Record<string, unknown>) => void;
}

/**
 * Dispatches a `Block` to the correct sub-component based on `block.type`.
 * This is the **only** authorised renderer for agent responses (REQ-2, ADR-1).
 */
export function BlockRenderer({ block, onAction }: BlockRendererProps) {
  switch (block.type) {
    case "text":
      return <TextBlock block={block} />;
    case "preview":
      return <PreviewBlock block={block} onAction={onAction} />;
    case "action":
      return (
        <ActionBlock
          block={block}
          onClick={() => onAction?.(block.action, block.params)}
        />
      );
    case "navigation":
      return <NavigationBlock block={block} />;
    case "loading":
      return <LoadingBlock block={block} />;
    case "error":
      return <ErrorBlock block={block} />;
    case "success":
      return <SuccessBlock block={block} />;
    default:
      // ponytail: Unknown block types render nothing — upgrade path is
      // to add the case above when a new variant is specced.
      return null;
  }
}
