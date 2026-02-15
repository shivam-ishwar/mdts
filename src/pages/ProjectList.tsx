import { useEffect, useMemo, useState } from "react";
import { Button, Modal, Table, Tooltip } from "antd";
import { useNavigate } from "react-router-dom";
import { RobotOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { db } from "../Utils/dataStorege.ts";
import { ToastContainer } from "react-toastify";
import { notify } from "../Utils/ToastNotify.tsx";
import { getCurrentUser } from "../Utils/moduleStorage.ts";
import "../styles/projectlist.css";

interface ProjectParameters {
  companyName: string;
  projectName: string;
  reserve: string;
  netGeologicalReserve: string;
  extractableReserve: string;
  stripRatio: string;
  peakCapacity: string;
  mineLife: string;
  totalCoalBlockArea: string;
  mineral: string;
  typeOfMine: string;
  grade: string;
  state: string;
  district: string;
  nearestTown: string;
  nearestAirport: string;
  nearestRailwayStation: string;
  mineOwner: string;
  dateOfH1Bidder: string | null;
  cbdpaDate: string | null;
  vestingOrderDate: string | null;
  pbgAmount: string;
  view?: boolean;
}

interface ProjectData {
  id: number;
  projectParameters: ProjectParameters;
  members?: string[];
  status?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  orgId?: string;
  projectTimeline?: any;
  userGuiId: string;
}

const ProjectsList = () => {
  const [allProjects, setAllProjects] = useState<ProjectData[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ProjectData | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const navigate = useNavigate();

  const getAllProjects = async () => {
    if (!currentUser) return;
    try {
      const storedData: ProjectData[] = await db.getProjects();
      const orgProjects =
        storedData?.filter((proj: any) => proj.orgId == currentUser.orgId) || [];
      setAllProjects(orgProjects);
    } catch (error) {
      console.error("An unexpected error occurred while fetching projects:", error);
    }
  };

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  useEffect(() => {
    if (currentUser?.orgId) getAllProjects();
  }, [currentUser]);

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    try {
      await db.deleteProject(projectToDelete.id);
      await getAllProjects();
      notify.success("Project removed successfully");
    } catch (error: any) {
      notify.error(`Error deleting project: ${error.message}`);
    } finally {
      setIsDeleteModalOpen(false);
      setProjectToDelete(null);
    }
  };

  const showDeleteModal = (project: ProjectData) => {
    setProjectToDelete(project);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setProjectToDelete(null);
    setIsDeleteModalOpen(false);
  };

  const columns = useMemo(
    () => [
      {
        title: "Project Name",
        dataIndex: ["projectParameters", "projectName"],
        key: "projectName",
      },
      {
        title: "Company",
        dataIndex: ["projectParameters", "companyName"],
        key: "companyName",
      },
      {
        title: "Mineral",
        dataIndex: ["projectParameters", "mineral"],
        key: "mineral",
      },
      {
        title: "Type of Mine",
        dataIndex: ["projectParameters", "typeOfMine"],
        key: "typeOfMine",
      },
      {
        title: "Grade",
        dataIndex: ["projectParameters", "grade"],
        key: "grade",
      },
      {
        title: "Reserve",
        dataIndex: ["projectParameters", "reserve"],
        key: "reserve",
      },
      {
        title: "Extractable Reserve",
        dataIndex: ["projectParameters", "extractableReserve"],
        key: "extractableReserve",
      },
      {
        title: "Peak Capacity",
        dataIndex: ["projectParameters", "peakCapacity"],
        key: "peakCapacity",
      },
      {
        title: "Mine Life (Years)",
        dataIndex: ["projectParameters", "mineLife"],
        key: "mineLife",
      },
      {
        title: "Coal Block Area",
        dataIndex: ["projectParameters", "totalCoalBlockArea"],
        key: "totalCoalBlockArea",
      },
      {
        title: "Members",
        dataIndex: "members",
        key: "members",
        render: (members: string[] | undefined) => (
          <span className="pl-members">👥 {members?.length || 0}</span>
        ),
      },
      {
        title: "Actions",
        key: "actions",
        render: (_: any, record: ProjectData) => {
          const hasTimeline = record.projectTimeline && record.projectTimeline.length > 0;
          const isOwner = record.userGuiId === currentUser?.guiId;
          const canModify = isOwner && !hasTimeline;

          return (
            <div className="pl-actions">
              <Tooltip
                title={
                  !isOwner
                    ? "You are not the owner of this project"
                    : hasTimeline
                    ? "Timeline created - editing not allowed"
                    : "Edit project"
                }
              >
                <Button
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/update-project/${record.id}`)}
                  disabled={!canModify}
                  className="pl-icon-btn"
                />
              </Tooltip>

              <Tooltip
                title={
                  !isOwner
                    ? "You are not the owner of this project"
                    : hasTimeline
                    ? "Timeline created - deletion not allowed"
                    : "Delete project"
                }
              >
                <Button
                  icon={<DeleteOutlined />}
                  danger
                  onClick={() => showDeleteModal(record)}
                  disabled={!canModify}
                  className="pl-icon-btn"
                />
              </Tooltip>
            </div>
          );
        },
      },
    ],
    [currentUser, navigate]
  );

  return (
    <>
      <div className="pl-page">
        <div className="pl-header">
          <div className="pl-title">
            <p className="page-heading-title">Projects</p>
            <span className="pl-subtitle">View and manage projects across your organization</span>
          </div>

          <Button
            size="small"
            icon={<RobotOutlined />}
            onClick={() => navigate("/create/register-new-project")}
            className="pl-new-btn"
            type="primary"
          >
            New
          </Button>
        </div>

        <div className="pl-card">
          <Table
            className="pl-table"
            columns={columns as any}
            dataSource={allProjects}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </div>

        <Modal
          title="Confirm Deletion"
          open={isDeleteModalOpen}
          onOk={handleDeleteProject}
          onCancel={closeDeleteModal}
          okText="Delete"
          okButtonProps={{ danger: true }}
          className="pl-modal"
          centered
        >
          <p className="pl-modal-text">Are you sure you want to delete this project?</p>
        </Modal>

        <ToastContainer />
      </div>
    </>
  );
};

export default ProjectsList;
