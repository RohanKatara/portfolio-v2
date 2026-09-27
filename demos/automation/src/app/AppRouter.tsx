import { createHashRouter, RouterProvider } from "react-router-dom";
import Layout from "./Layout";
import ErrorPage from "./ErrorPage";
import Home from "../pages/Home";
const router = createHashRouter([
  {
    element: <Layout />,
    errorElement: <ErrorPage />,
    hydrateFallbackElement: (
      <div className="route-loading" role="status">
        Opening workflow…
      </div>
    ),
    children: [
      { index: true, element: <Home /> },
      {
        path: "quotes",
        lazy: async () => ({
          Component: (await import("../pages/Quotes")).default,
        }),
        errorElement: <ErrorPage />,
      },
      {
        path: "orders",
        lazy: async () => ({
          Component: (await import("../pages/Orders")).default,
        }),
        errorElement: <ErrorPage />,
      },
      {
        path: "receivables",
        lazy: async () => ({
          Component: (await import("../pages/Receivables")).default,
        }),
        errorElement: <ErrorPage />,
      },
      {
        path: "*",
        element: (
          <div className="error-page">
            <h1>That workflow isn’t here.</h1>
            <a className="button primary" href="#/">
              Return to the gallery
            </a>
          </div>
        ),
      },
    ],
  },
]);
export default function AppRouter() {
  return <RouterProvider router={router} />;
}
