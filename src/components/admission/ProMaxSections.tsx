/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TextBlock = {
  type: "text";
  title?: string;
  body: string;
};

type ImageBlock = {
  type: "image" | "gif";
  src: string;
  alt: string;
  caption?: string;
  fit?: "cover" | "contain";
};

type VideoBlock = {
  type: "video";
  src: string;
  title?: string;
  poster?: string;
  caption?: string;
};

type EmbedBlock = {
  type: "embed";
  src: string;
  title: string;
  caption?: string;
};

export type ProMaxContentBlock = TextBlock | ImageBlock | VideoBlock | EmbedBlock;

type ProMaxContentSectionProps = {
  title: string;
  blocks: ProMaxContentBlock[];
};

type ProMaxPlaceholderSectionProps = {
  title: string;
  message: string;
};

type ProMaxMediaGridProps = {
  title: string;
  blocks: ProMaxContentBlock[];
};

type ProMaxCalculatorLinkSectionProps = {
  href: string;
};

export function ProMaxCalculatorLinkSection({ href }: ProMaxCalculatorLinkSectionProps) {
  return (
    <Card className="border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-card to-secondary/10">
      <CardHeader>
        <CardTitle className="text-xl">Công cụ tính điểm</CardTitle>
      </CardHeader>
      <CardContent>
        <Button asChild variant="hero" size="lg">
          <Link href={href}>Tính điểm xét tuyển</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function ProMaxContentSection({ title, blocks }: ProMaxContentSectionProps) {
  return (
    <Card className="overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-background via-card to-primary/5">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {blocks.map((block, index) => (
          <ProMaxBlock key={`${block.type}-${index}`} block={block} />
        ))}
      </CardContent>
    </Card>
  );
}

export function ProMaxPlaceholderSection({ title, message }: ProMaxPlaceholderSectionProps) {
  return (
    <Card className="border-2 border-dashed border-primary/40 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-primary/25 bg-background p-5 text-sm font-semibold leading-6 text-foreground">
          {message}
        </div>
      </CardContent>
    </Card>
  );
}

export function ProMaxMediaGrid({ title, blocks }: ProMaxMediaGridProps) {
  return (
    <Card className="overflow-hidden border-2 border-secondary/40 bg-gradient-to-br from-secondary/10 via-card to-accent/10">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {blocks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có meme nào trong JSON.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {blocks.map((block, index) => (
              <ProMaxBlock key={`${block.type}-${index}`} block={block} compact />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProMaxBlock({
  block,
  compact = false,
}: {
  block: ProMaxContentBlock;
  compact?: boolean;
}) {
  if (block.type === "text") {
    return (
      <div className="rounded-lg border border-border bg-background p-5">
        {block.title ? <h3 className="font-display text-lg font-bold">{block.title}</h3> : null}
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{block.body}</p>
      </div>
    );
  }

  if (block.type === "image" || block.type === "gif") {
    const imageClass =
      block.fit === "contain"
        ? "h-auto w-full object-contain"
        : `w-full object-cover ${compact ? "aspect-square" : "aspect-video"}`;

    return (
      <figure className="overflow-hidden rounded-lg border border-border bg-background">
        <img
          src={block.src}
          alt={block.alt}
          className={imageClass}
          loading="lazy"
        />
        {block.caption ? (
          <figcaption className="p-3 text-xs font-medium text-muted-foreground">
            {block.caption}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  if (block.type === "video") {
    return (
      <figure className="overflow-hidden rounded-lg border border-border bg-background">
        <video
          className="aspect-video w-full bg-black"
          controls
          poster={block.poster}
          preload="metadata"
          title={block.title}
        >
          <source src={block.src} />
        </video>
        {block.caption ? (
          <figcaption className="p-3 text-xs font-medium text-muted-foreground">
            {block.caption}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  if (block.type === "embed") {
    return (
      <figure className="overflow-hidden rounded-lg border border-border bg-background">
        <iframe
          src={block.src}
          title={block.title}
          className="aspect-video w-full"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
        {block.caption ? (
          <figcaption className="p-3 text-xs font-medium text-muted-foreground">
            {block.caption}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  return null;
}
