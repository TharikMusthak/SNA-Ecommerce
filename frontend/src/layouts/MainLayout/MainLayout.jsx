import Navbar from "@components/layout/Navbar/Navbar";
import Footer from "@components/layout/Footer/Footer";
import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
const MainLayout = () => {

  function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }, [pathname]);

  return null;
}
  return (
    <>
      <Navbar/>
<ScrollToTop/>
      <main className="min-h-screen">
        <Outlet />
      </main>

      <Footer/>
    </>
  );
};

export default MainLayout;