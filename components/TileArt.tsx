export function TileArt({ id }: { id: string }) {
  return <img src={`/tiles/${id}.png`} alt="" draggable={false} />;
}
