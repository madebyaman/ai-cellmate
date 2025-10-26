import { Welcome } from "../welcome/welcome";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Home - AI Cellmate" },
    { name: "description", content: "AI Cellmate - Intelligent CSV data enrichment with AI-powered web search and automated data discovery." },
  ];
}

export default function Home() {
  return <Welcome />;
}
