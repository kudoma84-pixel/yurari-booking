import { redirect } from "next/navigation";

export default function Page() {
  redirect("/src?openExternalBrowser=1");
}
