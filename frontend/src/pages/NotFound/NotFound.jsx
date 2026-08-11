import { ArrowLeft, Home, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <main className="grid min-h-[70vh] place-items-center overflow-hidden bg-[#f7faf8] px-5 py-12">
      <section className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-emerald-100 bg-white px-6 py-12 text-center shadow-xl shadow-emerald-950/5 sm:px-12 sm:py-16">
        <div className="absolute -left-20 -top-20 h-52 w-52 rounded-full bg-emerald-100/70" />
        <div className="absolute -bottom-24 -right-16 h-64 w-64 rounded-full border-[32px] border-emerald-50" />
        <div className="relative">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-[#079447]">
            <Search size={28} strokeWidth={2.2} />
          </div>
          <p className="mt-7 text-7xl font-bold tracking-[-0.08em] text-[#075d32] sm:text-8xl">
            404
          </p>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-[#079447]">
            Healthy choices, one step away
          </p>
          <h1 className="mt-4 text-2xl font-semibold text-gray-900 sm:text-3xl">
            We couldn’t find this wellness page.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500 sm:text-base">
            The product or page may have moved. Explore our natural, nourishing products and find something good for your everyday wellness.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#079447] px-5 py-3 font-semibold text-white shadow-lg shadow-emerald-700/20 transition hover:bg-[#067d3c]"
            >
              <Home size={18} /> Explore healthy products
            </Link>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 font-semibold text-gray-700 transition hover:border-emerald-200 hover:bg-emerald-50"
            >
              <ArrowLeft size={18} /> Go back
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default NotFound;
NotFound
