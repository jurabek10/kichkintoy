import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { Stats } from "@/components/stats";
import { Mission } from "@/components/mission";
import { Values } from "@/components/values";
import { Features } from "@/components/features";
import { Showcase } from "@/components/showcase";
import { Roles } from "@/components/roles";
import { Payments } from "@/components/payments";
import { Services } from "@/components/services";
import { GetStarted } from "@/components/get-started";
import { Footer } from "@/components/footer";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Stats />
        <Mission />
        <Values />
        <Features />
        <Showcase />
        <Roles />
        <Payments />
        <Services />
        <GetStarted />
      </main>
      <Footer />
    </>
  );
}
