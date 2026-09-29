const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

export function TileArt({ id }: { id: string }) {
  return <img src={`${base}/tiles/${id}.png`} alt="" draggable={false} />;
}
