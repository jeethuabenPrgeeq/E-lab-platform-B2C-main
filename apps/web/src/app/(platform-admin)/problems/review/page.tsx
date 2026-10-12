import ProblemsListPage from '@/features/admin/problems/ProblemsListPage/ProblemsListPage';

export default function Page() {
  return (
    <ProblemsListPage
      status="review"
      title="Technical Review"
      subtitle="Approve problems that are correct and fully tested, or send them back with a reason."
    />
  );
}