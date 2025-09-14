/**
 * Type definitions for Prestige AI block system
 * Inspired by dyad's block system but adapted for Prestige AI tags
 */

export type PrestigeBlockState = "pending" | "finished" | "aborted";

export interface PrestigeBlockProps {
  children?: React.ReactNode;
  node?: {
    properties?: {
      state?: PrestigeBlockState;
      [key: string]: any;
    };
  };
}

export type PrestigeContentPiece =
  | { type: "markdown"; content: string }
  | { type: "prestige-think"; content: string; inProgress?: boolean }
  | { type: "prestige-write"; path: string; description: string; content: string; inProgress?: boolean }
  | { type: "prestige-rename"; from: string; to: string; inProgress?: boolean }
  | { type: "prestige-delete"; path: string; inProgress?: boolean }
  | { type: "prestige-add-dependency"; packages: string; inProgress?: boolean }
  | { type: "prestige-command"; commandType: string; inProgress?: boolean }
  | { type: "prestige-add-integration"; provider: string; content?: string; inProgress?: boolean }
  | { type: "prestige-chat-summary"; content: string };

export interface PrestigeTagInfo {
  tag: string;
  attributes: Record<string, string>;
  content: string;
  fullMatch: string;
  inProgress?: boolean;
}