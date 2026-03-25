# Component Patterns

## Overview

UI development rules that apply across web and mobile:

1. **Single Modal Pattern** - One modal for create/edit
2. **Extend, Don't Rewrite** - Modify existing components
3. **Loading States** - Always handle loading/error/empty
4. **Server vs Client** - Know when to use each (web)

## Single Modal Pattern

One modal component handles both create and edit modes:

```tsx
// components/contacts/contact-modal.tsx

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
  contact?: Contact;  // If provided, we're editing
}

export function ContactModal({ open, onClose, contact }: ContactModalProps) {
  const isEditing = !!contact;
  const title = isEditing ? 'Edit Contact' : 'New Contact';

  const form = useForm<ContactFormData>({
    defaultValues: contact ?? {
      first_name: '',
      last_name: '',
      email: '',
    },
  });

  const mutation = isEditing
    ? useUpdateContact(contact.id)
    : useCreateContact();

  async function onSubmit(data: ContactFormData) {
    await mutation.mutateAsync(data);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Form fields */}
            <FormField name="first_name" ... />
            <FormField name="last_name" ... />
            <FormField name="email" ... />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {isEditing ? 'Save Changes' : 'Create Contact'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

### Usage

```tsx
function ContactsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | undefined>();

  function handleCreate() {
    setEditingContact(undefined);
    setModalOpen(true);
  }

  function handleEdit(contact: Contact) {
    setEditingContact(contact);
    setModalOpen(true);
  }

  return (
    <>
      <Button onClick={handleCreate}>New Contact</Button>

      <ContactList onEdit={handleEdit} />

      <ContactModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        contact={editingContact}
      />
    </>
  );
}
```

## Extend, Don't Rewrite

When modifying existing components, extend rather than replace:

### Adding a Feature

```tsx
// ✓ Correct: Add new prop, preserve existing behavior
interface ContactCardProps {
  contact: Contact;
  onEdit?: () => void;
  showVehicles?: boolean;  // NEW: optional feature
}

function ContactCard({ contact, onEdit, showVehicles = false }: ContactCardProps) {
  return (
    <Card>
      {/* Existing content unchanged */}
      <CardHeader>...</CardHeader>
      <CardContent>...</CardContent>

      {/* New feature, optional */}
      {showVehicles && <ContactVehicles contactId={contact.id} />}
    </Card>
  );
}
```

### Modifying Behavior

```tsx
// ✓ Correct: Override specific behavior via props
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onRowClick?: (row: T) => void;  // Allow override
  renderEmpty?: () => ReactNode;   // Allow custom empty state
}

// ✗ Wrong: Copying entire component to change one thing
```

## Loading States

Always handle three states:

```tsx
function ContactsPage() {
  const { data: contacts, isLoading, error } = useContacts();

  // 1. Loading state
  if (isLoading) {
    return <ContactsSkeleton />;
  }

  // 2. Error state
  if (error) {
    return (
      <ErrorDisplay
        error={error}
        retry={() => refetch()}
      />
    );
  }

  // 3. Empty state
  if (!contacts?.length) {
    return (
      <EmptyState
        icon={<UsersIcon />}
        title="No contacts yet"
        description="Create your first contact to get started"
        action={<Button onClick={handleCreate}>Add Contact</Button>}
      />
    );
  }

  // 4. Success state
  return <ContactList contacts={contacts} />;
}
```

### Skeleton Components

```tsx
// components/contacts/contacts-skeleton.tsx
export function ContactsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

## Server vs Client Components (Web)

### Server Components (Default)

```tsx
// app/(protected)/contacts/page.tsx
// No 'use client' = Server Component

import { createClient } from '@/lib/supabase/server';

export default async function ContactsPage() {
  const supabase = await createClient();

  // Server-side data fetch
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*');

  return <ContactList contacts={contacts} />;
}
```

### Client Components (When Needed)

```tsx
// components/contacts/contact-search.tsx
'use client';

import { useState } from 'react';
import { useContacts } from '@/hooks/query/use-contacts';

export function ContactSearch() {
  const [search, setSearch] = useState('');
  const { data: contacts } = useContacts({ search });

  return (
    <div>
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search contacts..."
      />
      <ContactResults contacts={contacts} />
    </div>
  );
}
```

### When to Use Client Components

| Use Client Component | Use Server Component |
|---------------------|---------------------|
| useState, useEffect | Static content |
| Event handlers (onClick) | Data fetching |
| Browser APIs | SEO-critical content |
| TanStack Query hooks | Initial page load |
| Forms with validation | Metadata |

## Form Patterns

### With react-hook-form + Zod

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const contactSchema = z.object({
  first_name: z.string().min(1, 'Required'),
  last_name: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

export function ContactForm({ onSubmit }: { onSubmit: (data: ContactFormData) => void }) {
  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="first_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Name *</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* More fields... */}
      </form>
    </Form>
  );
}
```

## Mobile-Specific Patterns

### Bottom Sheet Instead of Modal

```tsx
// Mobile uses bottom sheets for forms
import { BottomSheet } from '@/components/ui/bottom-sheet';

function ContactSheet({ open, onClose, contact }: ContactSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <BottomSheet.Header>
        <BottomSheet.Title>
          {contact ? 'Edit Contact' : 'New Contact'}
        </BottomSheet.Title>
      </BottomSheet.Header>

      <BottomSheet.Content>
        <ContactForm contact={contact} onSubmit={handleSubmit} />
      </BottomSheet.Content>
    </BottomSheet>
  );
}
```

### StyleSheet.create (No DOM APIs)

```tsx
// ✓ Correct: React Native styles
import { StyleSheet, View, Text } from 'react-native';

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
});

// ✗ Wrong: DOM APIs don't exist in React Native
// className="p-4 bg-white"
// document.getElementById()
```

## Summary

| Pattern | Rule |
|---------|------|
| **Single Modal** | One component for create/edit, mode via props |
| **Extend** | Add props/features, don't copy-paste entire components |
| **Loading States** | Always handle loading, error, empty, success |
| **Server Components** | Default for pages, fetch data server-side |
| **Client Components** | Only when needed (state, events, hooks) |
| **Forms** | react-hook-form + Zod for validation |
| **Mobile** | Bottom sheets, StyleSheet.create, no DOM APIs |
