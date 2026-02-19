import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ScheduleProvider } from "./contexts/ScheduleContext";
import Dashboard from "./pages/Dashboard";
import Team from "./pages/Team";
import Holidays from "./pages/Holidays";
import Scales from "./pages/Scales";


function Router() {
  return (
    <Switch>
      <Route path={"/?"} component={Dashboard} />
      <Route path={"/equipe"} component={Team} />
      <Route path={"/feriados"} component={Holidays} />
      <Route path={"/escalas"} component={Scales} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <ScheduleProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ScheduleProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
