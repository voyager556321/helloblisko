import { HomeScreen } from "./ui";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <HomeScreen token={token} />;
}
