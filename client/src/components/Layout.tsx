import { Link, useLocation } from "wouter";
import { Home, Users, AlertCircle, Layers } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { adminLogin, adminLogout, isAdmin, setAdmin } from "@/auth/adminAuth";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const admin = isAdmin();
  const navItems = [
    { href: "/", label: "Hoje", icon: Home },
    { href: "/equipe", label: "Equipe", icon: Users },
    { href: "/feriados", label: "Feriados", icon: AlertCircle },
    { href: "/escalas", label: "Escalas", icon: Layers },
  ];

  const handleAdminClick = async () => {
    if (admin) {
      adminLogout();
      alert("Modo admin desativado");
      window.location.reload();
      return;
    }

    const password = prompt("Senha de administrador:");
    if (!password) return;

    const ok = await adminLogin(password);
    if (ok) {
      setAdmin(true);
      alert("Modo admin ativado");
      window.location.reload();
    } else {
      alert("Senha incorreta");
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border shadow-sm">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-sidebar-primary">
            Escala Plantão
          </h1>
          <p className="text-sm text-sidebar-foreground/60 mt-1">
            Hortolândia 2026
          </p>
        </div>

        <nav className="mt-8 px-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <a
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </a>
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 px-4">
          <Button variant="outline" className="w-full" onClick={handleAdminClick}>
            {admin ? "Sair do admin" : "Entrar como admin"}
          </Button>
        </div>

      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
