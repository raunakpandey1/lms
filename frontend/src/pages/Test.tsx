import { useEffect, useState } from "react";

type Todo = {
  userId: number;
  id: number;
  title: string;
  completed: boolean;
};

export function Test() {
  const [data, setData] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

   
 useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await fetch(
        "https://jsonplaceholder.typicode.com/todos"
      );
      const res = await response.json();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, []);

  if (loading) {
    return <h2>Loading....</h2>;
  }
  return (
    <>
      {data.map((d) => (
        <div key={d.id}>
          <p>{d.title}</p>
        </div>
      ))}
    </>
  );
}
