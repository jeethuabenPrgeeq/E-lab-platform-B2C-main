'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FieldValue, RuntimeKind, RuntimeRecord, RuntimeStore } from './types';

const KEY = 'elab_runtimes_v1';

const day = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

const SEED: RuntimeStore = {
  languages: [
    { id: 'lang-c', name: 'C', fileExtension: '.c', compileCommand: 'gcc -O2 -o main main.c', runCommand: './main', timeLimitMs: 2000, memoryLimitMb: 256, status: 'active', updatedAt: day(2) },
    { id: 'lang-cpp', name: 'C++', fileExtension: '.cpp', compileCommand: 'g++ -O2 -std=c++17 -o main main.cpp', runCommand: './main', timeLimitMs: 2000, memoryLimitMb: 256, status: 'active', updatedAt: day(3) },
    { id: 'lang-java', name: 'Java', fileExtension: '.java', compileCommand: 'javac Main.java', runCommand: 'java Main', timeLimitMs: 4000, memoryLimitMb: 512, status: 'active', updatedAt: day(4) },
    { id: 'lang-python', name: 'Python', fileExtension: '.py', compileCommand: '', runCommand: 'python3 main.py', timeLimitMs: 5000, memoryLimitMb: 256, status: 'active', updatedAt: day(5) },
    { id: 'lang-js', name: 'JavaScript', fileExtension: '.js', compileCommand: '', runCommand: 'node main.js', timeLimitMs: 4000, memoryLimitMb: 256, status: 'active', updatedAt: day(6) },
    { id: 'lang-go', name: 'Go', fileExtension: '.go', compileCommand: 'go build -o main main.go', runCommand: './main', timeLimitMs: 2000, memoryLimitMb: 256, status: 'disabled', updatedAt: day(9) },
  ],
  frameworks: [
    { id: 'fw-spring', name: 'Spring Boot', language: 'lang-java', testRunner: 'JUnit 5', version: '3.3', status: 'active', updatedAt: day(3) },
    { id: 'fw-django', name: 'Django', language: 'lang-python', testRunner: 'pytest', version: '5.0', status: 'active', updatedAt: day(4) },
    { id: 'fw-react', name: 'React', language: 'lang-js', testRunner: 'Jest', version: '18.3', status: 'active', updatedAt: day(5) },
    { id: 'fw-express', name: 'Express', language: 'lang-js', testRunner: 'Jest', version: '4.19', status: 'active', updatedAt: day(6) },
    { id: 'fw-flask', name: 'Flask', language: 'lang-python', testRunner: 'pytest', version: '3.0', status: 'disabled', updatedAt: day(10) },
  ],
  images: [
    { id: 'img-gcc', name: 'elab/gcc', tag: '13.2', purpose: 'judge', sizeMb: 1180, cpuLimit: 1, memoryMb: 512, status: 'ready', updatedAt: day(1) },
    { id: 'img-jdk', name: 'elab/temurin', tag: '21', purpose: 'judge', sizeMb: 460, cpuLimit: 1, memoryMb: 768, status: 'ready', updatedAt: day(2) },
    { id: 'img-python', name: 'elab/python', tag: '3.12', purpose: 'judge', sizeMb: 1020, cpuLimit: 1, memoryMb: 512, status: 'ready', updatedAt: day(2) },
    { id: 'img-node', name: 'elab/node', tag: '20', purpose: 'judge', sizeMb: 1100, cpuLimit: 1, memoryMb: 512, status: 'ready', updatedAt: day(3) },
    { id: 'img-terminal', name: 'elab/terminal', tag: '24.04', purpose: 'terminal', sizeMb: 310, cpuLimit: 0.5, memoryMb: 256, status: 'ready', updatedAt: day(4) },
    { id: 'img-go', name: 'elab/golang', tag: '1.23', purpose: 'judge', sizeMb: 820, cpuLimit: 1, memoryMb: 512, status: 'failed', updatedAt: day(7) },
  ],
  versions: [
    { id: 'ver-c-13', language: 'lang-c', version: 'GCC 13.2', image: 'img-gcc', isDefault: true, status: 'active', updatedAt: day(2) },
    { id: 'ver-cpp-13', language: 'lang-cpp', version: 'C++17 / GCC 13.2', image: 'img-gcc', isDefault: true, status: 'active', updatedAt: day(2) },
    { id: 'ver-java-21', language: 'lang-java', version: '21 LTS', image: 'img-jdk', isDefault: true, status: 'active', updatedAt: day(3) },
    { id: 'ver-java-17', language: 'lang-java', version: '17 LTS', image: 'img-jdk', isDefault: false, status: 'deprecated', updatedAt: day(20) },
    { id: 'ver-py-312', language: 'lang-python', version: '3.12', image: 'img-python', isDefault: true, status: 'active', updatedAt: day(3) },
    { id: 'ver-py-310', language: 'lang-python', version: '3.10', image: 'img-python', isDefault: false, status: 'deprecated', updatedAt: day(30) },
    { id: 'ver-js-20', language: 'lang-js', version: 'Node 20', image: 'img-node', isDefault: true, status: 'active', updatedAt: day(4) },
  ],
};

function load(): RuntimeStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as RuntimeStore;
      if (parsed && Array.isArray(parsed.languages)) return { ...SEED, ...parsed };
    }
  } catch {}
  return SEED;
}

function persist(store: RuntimeStore) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {}
}

const now = () => new Date().toISOString();

export function useRuntimeStore() {
  const [store, setStore] = useState<RuntimeStore>(SEED);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setStore(load());
    setLoaded(true);
  }, []);

  const mutate = useCallback((fn: (current: RuntimeStore) => RuntimeStore) => {
    setStore((current) => {
      const next = fn(current);
      persist(next);
      return next;
    });
  }, []);

  const create = useCallback(
    (kind: RuntimeKind, values: Record<string, FieldValue>) => {
      const id = `${kind}-${Date.now().toString(36)}`;
      mutate((current) => {
        const record: RuntimeRecord = {
          ...values,
          id,
          status: String(values.status ?? 'active'),
          updatedAt: now(),
        };
        if (kind === 'versions') {
          const hasDefault = current.versions.some((item) => item.language === record.language && item.isDefault);
          record.isDefault = !hasDefault;
        }
        return { ...current, [kind]: [record, ...current[kind]] };
      });
      return id;
    },
    [mutate],
  );

  const update = useCallback(
    (kind: RuntimeKind, id: string, patch: Record<string, FieldValue>) =>
      mutate((current) => ({
        ...current,
        [kind]: current[kind].map((item) => (item.id === id ? { ...item, ...patch, updatedAt: now() } : item)),
      })),
    [mutate],
  );

  const remove = useCallback(
    (kind: RuntimeKind, id: string) => mutate((current) => ({ ...current, [kind]: current[kind].filter((item) => item.id !== id) })),
    [mutate],
  );

  const setDefaultVersion = useCallback(
    (id: string) =>
      mutate((current) => {
        const target = current.versions.find((item) => item.id === id);
        if (!target) return current;
        return {
          ...current,
          versions: current.versions.map((item) =>
            item.language === target.language
              ? { ...item, isDefault: item.id === id, status: item.id === id ? 'active' : item.status, updatedAt: item.id === id ? now() : item.updatedAt }
              : item,
          ),
        };
      }),
    [mutate],
  );

  const pullImage = useCallback(
    (id: string) => {
      mutate((current) => ({
        ...current,
        images: current.images.map((item) => (item.id === id ? { ...item, status: 'pulling' } : item)),
      }));
      window.setTimeout(() => {
        mutate((current) => ({
          ...current,
          images: current.images.map((item) => (item.id === id ? { ...item, status: 'ready', updatedAt: now() } : item)),
        }));
      }, 1500);
    },
    [mutate],
  );

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    setStore(SEED);
  }, []);

  return { store, loaded, create, update, remove, setDefaultVersion, pullImage, reset };
}