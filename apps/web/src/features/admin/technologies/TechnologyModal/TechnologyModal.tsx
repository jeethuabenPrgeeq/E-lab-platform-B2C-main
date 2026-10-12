"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { validateTechnology } from "../lib/api";
import { CATEGORY_LABEL, STATUS_LABEL, cx, slugify } from "../lib/shared";
import { CATEGORIES, STATUSES, type Technology, type TechnologyInput, type TechStatus } from "../lib/types";
import styles from "./TechnologyModal.module.css";

const EMPTY: TechnologyInput = {
  name: "",
  slug: "",
  category: "language",
  runtimeImage: "",
  version: "",
  fileExtension: "",
  description: "",
  status: "draft",
};

type Errors = Partial<Record<keyof TechnologyInput, string>>;

interface TechnologyModalProps {
  initial: Technology | null;
  items: Technology[];
  onCancel: () => void;
  onSubmit: (input: TechnologyInput) => Promise<string | null>;
  lockedStatus?: TechStatus;
}

function toInput(item: Technology): TechnologyInput {
  const { name, slug, category, runtimeImage, version, fileExtension, description, status } = item;
  return { name, slug, category, runtimeImage, version, fileExtension, description, status };
}

export function TechnologyModal({ initial, items, onCancel, onSubmit, lockedStatus }: TechnologyModalProps) {
  const [form, setForm] = useState<TechnologyInput>(initial ? toInput(initial) : { ...EMPTY, status: lockedStatus ?? EMPTY.status });
  const [slugTouched, setSlugTouched] = useState(Boolean(initial));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const set = <K extends keyof TechnologyInput>(key: K, value: TechnologyInput[K]) => {
    setForm((current) => ({ ...current, [key]: value, ...(key === "name" && !slugTouched ? { slug: slugify(String(value)) } : {}) }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const cleaned: TechnologyInput = {
      ...form,
      name: form.name.trim(),
      slug: form.slug.trim(),
      runtimeImage: form.runtimeImage.trim(),
      version: form.version.trim(),
      fileExtension: form.fileExtension.trim().toLowerCase(),
      description: form.description.trim(),
    };
    const next = validateTechnology(cleaned, items, initial?.id);
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setSaving(true);
    setServerError("");
    const failure = await onSubmit(cleaned);
    setSaving(false);
    if (failure) setServerError(failure);
  };

  const field = (key: keyof TechnologyInput) => ({
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `tech-${key}-error` : undefined,
  });

  const error = (key: keyof TechnologyInput) =>
    errors[key] ? (
      <p id={`tech-${key}-error`} className={styles.errorText}>
        {errors[key]}
      </p>
    ) : null;

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="tech-modal-title">
        <div className={styles.modalHead}>
          <h2 id="tech-modal-title" className={styles.modalTitle}>
            {initial ? `Edit ${initial.name}` : "Add technology"}
          </h2>
          <button type="button" className={styles.iconButton} aria-label="Close" onClick={onCancel}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={submit} noValidate className={styles.form}>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="tech-name" className={styles.label}>
                Name<span className={styles.required}> *</span>
              </label>
              <input id="tech-name" ref={firstRef} className={cx(styles.control, errors.name && styles.controlError)} placeholder="e.g. Python" value={form.name} onChange={(event) => set("name", event.target.value)} {...field("name")} />
              {error("name")}
            </div>

            <div className={styles.field}>
              <label htmlFor="tech-slug" className={styles.label}>
                Slug<span className={styles.required}> *</span>
              </label>
              <input
                id="tech-slug"
                className={cx(styles.control, styles.mono, errors.slug && styles.controlError)}
                placeholder="python"
                value={form.slug}
                disabled={Boolean(initial)}
                onChange={(event) => {
                  setSlugTouched(true);
                  set("slug", event.target.value.toLowerCase());
                }}
                {...field("slug")}
              />
              {error("slug") ?? <p className={styles.hint}>{initial ? "The slug cannot change once created" : "Used in URLs and problem IDs"}</p>}
            </div>

            <div className={styles.field}>
              <label htmlFor="tech-category" className={styles.label}>
                Category
              </label>
              <select id="tech-category" className={styles.control} value={form.category} onChange={(event) => set("category", event.target.value as TechnologyInput["category"])}>
                {CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {CATEGORY_LABEL[value]}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="tech-ext" className={styles.label}>
                File extension
              </label>
              <input id="tech-ext" className={cx(styles.control, styles.mono, errors.fileExtension && styles.controlError)} placeholder=".py" value={form.fileExtension} onChange={(event) => set("fileExtension", event.target.value)} {...field("fileExtension")} />
              {error("fileExtension")}
            </div>

            <div className={styles.field}>
              <label htmlFor="tech-image" className={styles.label}>
                Runtime image
              </label>
              <input id="tech-image" className={cx(styles.control, styles.mono, errors.runtimeImage && styles.controlError)} placeholder="python" value={form.runtimeImage} onChange={(event) => set("runtimeImage", event.target.value)} {...field("runtimeImage")} />
              {error("runtimeImage") ?? <p className={styles.hint}>Docker image the judge runs submissions in</p>}
            </div>

            <div className={styles.field}>
              <label htmlFor="tech-version" className={styles.label}>
                Version
              </label>
              <input id="tech-version" className={cx(styles.control, styles.mono, errors.version && styles.controlError)} placeholder="3.12" value={form.version} onChange={(event) => set("version", event.target.value)} {...field("version")} />
              {error("version")}
            </div>

            <div className={cx(styles.field, styles.wide)}>
              <label htmlFor="tech-description" className={styles.label}>
                Description
              </label>
              <textarea id="tech-description" rows={3} className={cx(styles.control, errors.description && styles.controlError)} placeholder="What learners practise with this technology" value={form.description} onChange={(event) => set("description", event.target.value)} {...field("description")} />
              {error("description") ?? <p className={styles.hint}>{`${form.description.length}/200`}</p>}
            </div>

            {lockedStatus ? (
              <p className={cx(styles.hint, styles.wide)}>{`Saved as ${STATUS_LABEL[lockedStatus]} so you can upload problems to it right away`}</p>
            ) : (
              <fieldset className={cx(styles.fieldset, styles.wide)}>
                <legend className={styles.label}>Status</legend>
                <div className={styles.segmented}>
                  {STATUSES.map((value) => (
                    <label key={value} className={cx(styles.segment, form.status === value && styles.segmentActive)}>
                      <input type="radio" name="tech-status" value={value} checked={form.status === value} onChange={() => set("status", value)} />
                      {STATUS_LABEL[value]}
                    </label>
                  ))}
                </div>
                <p className={styles.hint}>Only active technologies appear in upload and problem forms</p>
              </fieldset>
            )}
          </div>

          {serverError && (
            <p className={styles.errorText} role="alert">
              {serverError}
            </p>
          )}

          <div className={styles.footer}>
            <button type="button" className={styles.ghostButton} onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryButton} disabled={saving}>
              {saving ? "Saving…" : initial ? "Save changes" : "Add technology"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
