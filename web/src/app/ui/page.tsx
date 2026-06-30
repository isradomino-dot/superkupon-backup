import type { Metadata } from "next";
import { Sparkles, Check, ArrowRight, Tag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

// Internal dev gallery — not for public/SEO.
export const metadata: Metadata = {
  title: "UI Kit Preview (internal)",
  robots: { index: false, follow: false },
};

export default function UiPreviewPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-brand-400" />
          <h1 className="text-2xl font-bold">shadcn/ui Preview</h1>
          <Badge variant="secondary">internal</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Foundation Phase 1–2 — verifikasi primitif nyatu dengan tema SuperKupon
          (violet dark). Halaman ini noindex, cuma buat dev.
        </p>
      </header>

      {/* Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Button</CardTitle>
          <CardDescription>6 variant + ukuran + ikon (lucide)</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button>
            Klaim Sekarang
            <ArrowRight />
          </Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" aria-label="Konfirmasi">
            <Check />
          </Button>
        </CardContent>
      </Card>

      {/* Badges */}
      <Card>
        <CardHeader>
          <CardTitle>Badge</CardTitle>
          <CardDescription>Label status kupon</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Badge>
            <Tag className="size-3" />
            Baru
          </Badge>
          <Badge variant="secondary">Populer</Badge>
          <Badge variant="destructive">Hampir Habis</Badge>
          <Badge variant="outline">Gratis Ongkir</Badge>
        </CardContent>
      </Card>

      {/* Form: Input + Label + Separator */}
      <Card>
        <CardHeader>
          <CardTitle>Input + Label + Separator</CardTitle>
          <CardDescription>
            Cek input legacy override (!important) tetap on-brand
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="kode">Kode Kupon</Label>
            <Input id="kode" placeholder="cth. SHOPEECB30" />
          </div>
          <Separator />
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="kamu@email.com" />
          </div>
        </CardContent>
        <CardFooter className="gap-2">
          <Button>Simpan</Button>
          <Button variant="ghost">Batal</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
