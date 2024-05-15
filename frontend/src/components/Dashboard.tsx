import { useEffect, useState } from 'react';
import { EKSClient, DescribeClusterCommand } from '@aws-sdk/client-eks';
import axios from 'axios';

// Configure AWS SDK v3
const region = 'us-east-1'; // Change to your region


// Create an Axios instance
const axiosInstance = axios.create();

// Add a request interceptor
axiosInstance.interceptors.request.use(config => {
  config.headers['Access-Control-Allow-Origin'] = '*';
  return config;
}, error => {
  return Promise.reject(error);
});



const eksClient = new EKSClient({
  region,
  credentials: {
    accessKeyId: "AKIA3X4DCJJWHYF5M42F",
    secretAccessKey: "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",
  },
});

const Header = () => {
  return (
    <header className="bg-gray-900 text-white py-4 px-6">
      <h1 className="text-2xl font-bold">Kubernetes Dashboard</h1>
    </header>
  );
};

const Card = ({ title, children, className = "" }) => {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg shadow-md p-6 ${className}`}>
      <h2 className="text-lg font-bold mb-4 dark:text-white">{title}</h2>
      {children}
    </div>
  );
};

const StatusItem = ({ value, label }) => {
  return (
    <div className="bg-gray-200 dark:bg-gray-800 rounded-lg p-4">
      <p className="text-4xl font-bold dark:text-white">{value}</p>
      <p className="text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
};

const StatusTable = ({ headers, rows }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full table-auto">
        <thead>
          <tr className="bg-gray-200 dark:bg-gray-800">
            {headers.map((header, index) => (
              <th key={index} className="px-4 py-2 text-left dark:text-white">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-gray-200 dark:border-gray-800">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className={`px-4 py-2 ${cellIndex >= headers.length - 2 ? 'text-right' : 'text-left'} dark:text-white`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Dashboard = ({ clusterName }) => {
  const [clusterOverview, setClusterOverview] = useState({});
  const [nodes, setNodes] = useState([]);
  const [pods, setPods] = useState([]);

  useEffect(() => {
    const fetchClusterData = async () => {
      try {
        const clusterData = await eksClient.send(new DescribeClusterCommand({ name: clusterName }));
        const endpoint = clusterData.cluster.endpoint;

        console.log(endpoint)

        const nodeCount = await getNodeCount(endpoint);
        const podCount = await getPodCount(endpoint);
        const serviceCount = await getServiceCount(endpoint);

        setClusterOverview({
          nodes: nodeCount,
          pods: podCount,
          services: serviceCount,
        });

        const nodesData = await getNodeStatuses(endpoint);
        setNodes(nodesData);

        const podsData = await getPodStatuses(endpoint);
        setPods(podsData);

      } catch (error) {
        console.error('Error fetching data from AWS:', error);
      }
    };

    fetchClusterData();
  }, [clusterName]);

  const getNodeCount = async (endpoint) => {
    const response = await axiosInstance.get(`${endpoint}/api/v1/nodes`);
    return response.data.items.length;
  };

  const getPodCount = async (endpoint) => {
    const response = await axiosInstance.get(`${endpoint}/api/v1/pods`);
    return response.data.items.length;
  };

  const getServiceCount = async (endpoint) => {
    const response = await axiosInstance.get(`${endpoint}/api/v1/services`);
    return response.data.items.length;
  };

  const getNodeStatuses = async (endpoint) => {
    const response = await axiosInstance.get(`${endpoint}/api/v1/nodes`);
    return response.data.items.map(node => ({
      name: node.metadata.name,
      status: node.status.conditions.find(condition => condition.type === 'Ready').status === 'True' ? 'Running' : 'NotReady',
      cpu: `${Math.round((node.status.allocatable.cpu / node.status.capacity.cpu) * 100)}%`,
      memory: `${Math.round((node.status.allocatable.memory / node.status.capacity.memory) * 100)}%`,
    }));
  };

  const getPodStatuses = async (endpoint) => {
    const response = await axiosInstance.get(`${endpoint}/api/v1/pods`);
    return response.data.items.map(pod => ({
      name: pod.metadata.name,
      status: pod.status.phase,
      image: pod.spec.containers[0].image,
    }));
  };

  return (
    <div className="flex flex-col h-screen dark:bg-gray-900">
      <Header />
      <main className="flex-1 bg-gray-100 dark:bg-gray-800 p-6">
        <div className="grid grid-cols-1 gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card title="Cluster Overview">
              <div className="grid grid-cols-3 gap-4">
                <StatusItem value={clusterOverview.nodes} label="Nodes" />
                <StatusItem value={clusterOverview.pods} label="Pods" />
                <StatusItem value={clusterOverview.services} label="Services" />
              </div>
            </Card>
            <Card title="Node Status" className="md:col-span-2">
              <StatusTable
                headers={['Name', 'Status', 'CPU', 'Memory']}
                rows={nodes.map(node => [node.name, node.status, node.cpu, node.memory])}
              />
            </Card>
          </div>
          <Card title="Pod Status">
            <StatusTable
              headers={['Name', 'Status', 'Image']}
              rows={pods.map(pod => [pod.name, pod.status, pod.image])}
            />
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
