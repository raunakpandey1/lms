import { Navbar } from "./components/Navbar";
import { AppRoutes } from "./routes/AppRoutes";

function App() {
  return (
    <>
      <Navbar />
      <main className="container">
        <AppRoutes />
      </main>
    </>
  );
}

export default App;