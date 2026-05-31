import { redirect } from "next/navigation";

/** Legacy Memory route — Me lives at `/me`. */
export default function NotesRoute() {
  redirect("/me");
}
