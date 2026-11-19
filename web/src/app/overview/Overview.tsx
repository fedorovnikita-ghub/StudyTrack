'use client';

import Link from 'next/link';
import { useState } from 'react';
import Pagination from '@/components/ui/Pagination';
import QueryView from '@/components/ui/QueryView';
import { useGraphqlQuery } from '@/lib/graphql';

// Эта страница берет данные через GraphQL: запрос перечисляет только нужные экрану поля.
// В REST GET /courses отдает фиксированный набор полей, включая описание и версию
const MY_COURSES = `
  query MyCourses($page: Int!, $limit: Int!) {
    myCourses(page: $page, limit: $limit) {
      total
      page
      limit
      items {
        id
        title
        status
        category { name }
        teacher { displayName }
      }
    }
  }
`;

interface MyCoursesData {
  myCourses: {
    total: number;
    page: number;
    limit: number;
    items: {
      id: string;
      title: string;
      status: string;
      category: { name: string };
      teacher: { displayName: string };
    }[];
  };
}

const LIMIT = 10;

export default function Overview() {
  const [page, setPage] = useState(1);
  const courses = useGraphqlQuery<MyCoursesData>(MY_COURSES, { page, limit: LIMIT });

  return (
    <div className="stack">
      <h1>Обзор курсов</h1>
      <p className="muted">
        Страница получает данные через GraphQL (Query <code>myCourses</code>) и запрашивает только название, статус,
        категорию и преподавателя.
      </p>
      <section className="card">
        <QueryView query={courses}>
          {(data) =>
            data.myCourses.items.length === 0 ? (
              <p className="muted">Курсов пока нет.</p>
            ) : (
              <>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th scope="col">Курс</th>
                        <th scope="col">Категория</th>
                        <th scope="col">Преподаватель</th>
                        <th scope="col">Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.myCourses.items.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <Link href={`/courses/${c.id}`}>{c.title}</Link>
                          </td>
                          <td>{c.category.name}</td>
                          <td>{c.teacher.displayName}</td>
                          <td>{c.status === 'active' ? 'Активный' : 'В архиве'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={data.myCourses.page}
                  limit={data.myCourses.limit}
                  total={data.myCourses.total}
                  onChange={setPage}
                />
              </>
            )
          }
        </QueryView>
      </section>
    </div>
  );
}
