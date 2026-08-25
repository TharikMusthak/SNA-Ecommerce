import { Outlet, useMatches } from "react-router-dom";
import { useEffect } from "react";

const SITE_NAME = "SNA Sundaram";

const AuthLayout = () => {
  const matches = useMatches();

  useEffect(() => {
    const lastMatchWithTitle = [...matches].reverse().find((match) => match.handle?.title);
    const titleValue = lastMatchWithTitle?.handle?.title;
    const resolvedTitle =
      typeof titleValue === "function" ? titleValue(lastMatchWithTitle) : titleValue;
    document.title = resolvedTitle ? `${resolvedTitle} | ${SITE_NAME}` : SITE_NAME;
  }, [matches]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Outlet />
    </div>
  );
};

export default AuthLayout;
