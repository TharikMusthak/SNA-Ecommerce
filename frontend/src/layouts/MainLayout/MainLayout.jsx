import Navbar from "@components/layout/Navbar/Navbar";
import Footer from "@components/layout/Footer/Footer";
import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import { useLocation, useMatches } from "react-router-dom";

const SITE_NAME = "SNA Sundaram";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [pathname]);

  return null;
};

const MainLayout = () => {
  const matches = useMatches();

  useEffect(() => {
    const lastMatchWithTitle = [...matches].reverse().find((match) => match.handle?.title);
    const titleValue = lastMatchWithTitle?.handle?.title;
    const resolvedTitle =
      typeof titleValue === "function" ? titleValue(lastMatchWithTitle) : titleValue;
    document.title = resolvedTitle ? `${resolvedTitle} | ${SITE_NAME}` : SITE_NAME;
  }, [matches]);

  return (
    <>
      <Navbar/>
      <ScrollToTop />
      <main className="min-h-screen">
        <Outlet />
      </main>

      <Footer/>
    </>
  );
};

export default MainLayout;
