"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, Save, Upload } from "lucide-react";
import { toast } from "sonner";
import type { AlbumAudienceResponse, AlbumVisibility } from "@kichkintoy/shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";

export function AlbumComposer({ centerId }: { centerId: string | null }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<AlbumVisibility>("class");
  const [classIds, setClassIds] = useState<string[]>([]);
  const [childIds, setChildIds] = useState<string[]>([]);
  const [mediaAssetIds, setMediaAssetIds] = useState<string[]>([]);
  const [allowComments, setAllowComments] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: audience } = useQuery({
    queryKey: queryKeys.albums.audience(centerId ?? ""),
    queryFn: () => orpc.albums.audience({ centerId: centerId! }),
    enabled: !!centerId,
  });

  const visibleChildren = useMemo<AlbumAudienceResponse["children"]>(() => {
    if (!audience) return [];
    if (classIds.length === 0) return audience.children;
    return audience.children.filter((child) =>
      child.classId ? classIds.includes(child.classId) : false,
    );
  }, [audience, classIds]);

  const createMutation = useMutation({
    mutationFn: (publish: boolean) =>
      orpc.albums.create({
        centerId: centerId!,
        caption,
        visibility,
        classIds,
        childIds: visibility === "tagged_children" ? childIds : [],
        mediaAssetIds,
        allowComments,
        publish,
      }),
    onSuccess: async (post, publish) => {
      toast.success(publish ? "Album published." : "Album saved as draft.");
      await queryClient.invalidateQueries({ queryKey: queryKeys.albums.all() });
      router.push(`/dashboard/albums/${post.id}`);
    },
    onError: (err) => setError(toApiError(err).message),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save(false);
  }

  function save(publish: boolean) {
    setError(null);
    if (!centerId) return setError("Your account is not linked to a center.");
    if (classIds.length === 0) return setError("Choose at least one class.");
    if (visibility === "tagged_children" && childIds.length === 0) {
      return setError("Tag at least one child.");
    }
    if (publish && !caption.trim() && mediaAssetIds.length === 0) {
      return setError("Add a caption or photo before publishing.");
    }
    createMutation.mutate(publish);
  }

  async function uploadFiles(files: FileList | null) {
    if (!files || !centerId) return;
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files).slice(0, 50 - mediaAssetIds.length)) {
        const signed = await orpc.media.createUploadUrl({
          centerId,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          purpose: "album",
        });
        const response = await fetch(signed.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!response.ok) {
          throw new Error(`Upload failed for ${file.name}.`);
        }
        const asset = await orpc.media.completeUpload({
          mediaAssetId: signed.mediaAssetId,
        });
        uploaded.push(asset.id);
      }
      setMediaAssetIds((current) => [...current, ...uploaded]);
      if (uploaded.length > 0) toast.success(`${uploaded.length} file(s) uploaded.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    }
  }

  function toggleClass(id: string, checked: boolean) {
    setClassIds((current) =>
      checked ? [...current, id] : current.filter((classId) => classId !== id),
    );
    setChildIds((current) =>
      checked
        ? current
        : current.filter((childId) => {
            const child = audience?.children.find((item) => item.id === childId);
            return child?.classId !== id;
          }),
    );
  }

  function toggleChild(id: string, checked: boolean) {
    setChildIds((current) =>
      checked ? [...current, id] : current.filter((childId) => childId !== id),
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <Button asChild variant="ghost" className="w-fit">
        <Link href="/dashboard/albums">
          <ArrowLeft className="h-4 w-4" />
          Back to albums
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">New album post</CardTitle>
          <CardDescription>
            Share class photos with parent-safe visibility.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="album-caption">Caption</Label>
            <Textarea
              id="album-caption"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              rows={6}
              maxLength={4000}
            />
          </div>

          <div className="grid gap-2">
            <Label>Classes</Label>
            <div className="grid max-h-60 gap-2 overflow-auto rounded-md border p-3 sm:grid-cols-2">
              {(audience?.classes ?? []).map((klass) => (
                <label
                  key={klass.id}
                  className="flex items-center gap-2 rounded-md border p-3 text-sm"
                >
                  <Checkbox
                    checked={classIds.includes(klass.id)}
                    onCheckedChange={(checked) =>
                      toggleClass(klass.id, checked === true)
                    }
                  />
                  <span className="font-semibold">{klass.name}</span>
                </label>
              ))}
              {audience?.classes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No classes available.
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3">
            <Label>Visibility</Label>
            <RadioGroup
              value={visibility}
              onValueChange={(value) => setVisibility(value as AlbumVisibility)}
              className="grid gap-2 sm:grid-cols-2"
            >
              <VisibilityOption
                value="class"
                label="Class-wide"
                description="All guardians in selected classes can view it."
              />
              <VisibilityOption
                value="tagged_children"
                label="Tagged children"
                description="Only guardians of tagged children can view it."
              />
            </RadioGroup>
          </div>

          {visibility === "tagged_children" ? (
            <div className="grid gap-2">
              <Label>Tagged children</Label>
              <div className="grid max-h-64 gap-2 overflow-auto rounded-md border p-3 sm:grid-cols-2">
                {visibleChildren.map((child) => (
                  <label
                    key={child.id}
                    className="flex items-start gap-2 rounded-md border p-3 text-sm"
                  >
                    <Checkbox
                      checked={childIds.includes(child.id)}
                      onCheckedChange={(checked) =>
                        toggleChild(child.id, checked === true)
                      }
                    />
                    <span>
                      <span className="block font-semibold">{child.name}</span>
                      {child.className ? (
                        <span className="text-xs text-muted-foreground">
                          {child.className}
                        </span>
                      ) : null}
                    </span>
                  </label>
                ))}
                {visibleChildren.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Choose a class to tag children.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="album-assets">Photos</Label>
            <label className="grid cursor-pointer place-items-center gap-2 rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground transition hover:border-primary/50">
              <Upload className="h-6 w-6" />
              <span>Choose photos or videos</span>
              <Input
                id="album-assets"
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime"
                multiple
                className="sr-only"
                onChange={(event) => uploadFiles(event.target.files)}
              />
            </label>
            {mediaAssetIds.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                {mediaAssetIds.length} uploaded file(s) ready.
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="allow-comments">Allow comments</Label>
              <p className="text-xs text-muted-foreground">
                Parents can comment when the post is published.
              </p>
            </div>
            <Switch
              id="allow-comments"
              checked={allowComments}
              onCheckedChange={setAllowComments}
            />
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 flex justify-end gap-2 rounded-md border bg-background p-3 shadow-pop">
        <Button
          type="submit"
          variant="outline"
          disabled={createMutation.isPending}
        >
          <Save className="h-4 w-4" />
          Save draft
        </Button>
        <Button
          type="button"
          onClick={() => save(true)}
          disabled={createMutation.isPending}
        >
          <Send className="h-4 w-4" />
          Publish
        </Button>
      </div>
    </form>
  );
}

function VisibilityOption({
  value,
  label,
  description,
}: {
  value: AlbumVisibility;
  label: string;
  description: string;
}) {
  return (
    <label className="flex items-start gap-3 rounded-md border p-3">
      <RadioGroupItem value={value} />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}
