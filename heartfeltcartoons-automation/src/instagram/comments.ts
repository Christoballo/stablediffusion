import { config } from "../config.js";
import { graphRequest } from "./client.js";

export interface IgComment {
  id: string;
  text: string;
  username: string;
  timestamp: string;
  media_id: string;
}

interface MediaListResponse {
  data: Array<{ id: string; caption?: string; timestamp: string }>;
}

interface CommentListResponse {
  data: Array<{ id: string; text?: string; username?: string; timestamp: string }>;
}

/** Most recent media objects of the professional account. */
export async function getRecentMedia(limit = 10): Promise<Array<{ id: string; caption?: string }>> {
  const response = await graphRequest<MediaListResponse>(`${config.IG_ACCOUNT_ID}/media`, {
    params: { fields: "id,caption,timestamp", limit: String(limit) },
  });
  return response.data;
}

/** Comments on a single media object. */
export async function getComments(mediaId: string, limit = 50): Promise<IgComment[]> {
  const response = await graphRequest<CommentListResponse>(`${mediaId}/comments`, {
    params: { fields: "id,text,username,timestamp", limit: String(limit) },
  });
  return response.data.map((comment) => ({
    id: comment.id,
    text: comment.text ?? "",
    username: comment.username ?? "",
    timestamp: comment.timestamp,
    media_id: mediaId,
  }));
}

/** New comments across the most recent posts. */
export async function getRecentComments(mediaLimit = 5): Promise<IgComment[]> {
  const media = await getRecentMedia(mediaLimit);
  const all: IgComment[] = [];
  for (const item of media) {
    all.push(...(await getComments(item.id)));
  }
  return all;
}

/** Post a reply under a comment (official /replies edge). */
export async function postReply(commentId: string, message: string): Promise<{ id: string }> {
  return graphRequest<{ id: string }>(`${commentId}/replies`, {
    method: "POST",
    params: { message },
  });
}

/**
 * The Instagram Graph API does not offer a "like comment" endpoint.
 * To stay strictly within official functionality, likes are recorded
 * locally as intents for the dashboard; actual liking stays a manual
 * one-tap action in the app. If Meta ships an official endpoint, this
 * is the single place to wire it up.
 */
export async function likeComment(commentId: string): Promise<{ recordedOnly: true }> {
  void commentId;
  return { recordedOnly: true };
}

/** Hide a comment via the official endpoint (used for category G if desired). */
export async function hideComment(commentId: string, hide = true): Promise<void> {
  await graphRequest(`${commentId}`, { method: "POST", params: { hide: String(hide) } });
}
