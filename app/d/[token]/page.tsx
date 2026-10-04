import { Nunito_Sans } from "next/font/google";
import { HomeScreen } from "./ui";
import "./halo.css";

const nunito = Nunito_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

export const metadata = { title: "HaloBlisko" };

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <HomeScreen token={token} fontClass={nunito.className} />;
}
