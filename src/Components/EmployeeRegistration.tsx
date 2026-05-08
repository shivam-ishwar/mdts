import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Input, Select, Button, Form, Row, Col } from "antd";
import { ArrowRightOutlined } from "@ant-design/icons";
import "../styles/employee-registration.css"
import ImageContainer from "../Components/ImageContainer";
import { db } from "../Utils/dataStorege.ts";
import { ToastContainer } from "react-toastify";
import { notify } from "../Utils/ToastNotify.tsx";
import {
  COMPANY_TYPE_OPTIONS,
  INDUSTRY_TYPE_OPTIONS,
  OTHER_VALUE,
} from "../constants/companyAndIndustryOptions";
interface EmployeeData {
  name: string;
  company: string;
  role: string;
  mobile: string;
  email: string;
  designation: string;
  whatsapp: string;
  registrationDate: string | null;
  photo: string;
  password: string;
}

interface LocationState {
  user: EmployeeData | null;
  isEdit: boolean;
}
const { Option } = Select;

export const EmployeeRegistration = () => {
  const location = useLocation();
  const { isEdit }: LocationState = location.state || { user: null, isEdit: false };
  const [formData, setFormData] = useState<any>({
    id: null as number | null,
    name: null as string | null,
    company: null as string | null,
    designation: null as string | null,
    companyType: null as string | null,
    companyTypeOther: null as string | null,
    industryType: null as string | null,
    industryTypeOther: null as string | null,
    mobile: null as string | null,
    email: null as string | null,
    whatsapp: null as string | null,
    registeredOn: null as string | null,
    profilePhoto: null as string | null,
    password: null as string | null,
    isTempPassword: null as boolean | null,
    role: null as string | null,
    address: null as string | null,
    city: null as string | null,
    state: null as string | null,
    country: null as string | null,
    zipCode: null as string | null
  });

  const handleSave = async () => {
    try {
      const updatedUser = { formData };
      await db.addUsers(updatedUser);
    } catch (error) {
      notify.error("An error occurred while updating profile. Please try again.");
    }
  };

  const handleSelectChange = (value: any, name: any) => {
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleCompanyTypeChange = (value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      companyType: value,
      companyTypeOther: value === OTHER_VALUE ? prev.companyTypeOther ?? "" : "",
    }));
  };

  const handleIndustryTypeChange = (value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      industryType: value,
      industryTypeOther: value === OTHER_VALUE ? prev.industryTypeOther ?? "" : "",
    }));
  };

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  return (
    <>
      <div className="main-container-div-items">
        <div className="employee-registration">
          <div className="card-header bg-secondary">
            {isEdit ? "Edit Employee Details" : "Employee Registration"}
          </div>
          <div className="card">
            <div className="company-registration-form">
              <Form
                layout="horizontal"
                labelCol={{ span: 6 }}
                wrapperCol={{ span: 18 }}
                labelAlign="left"
              >
                <Row gutter={[16, 16]} className="form-row">
                  <Col span={12}>
                    <Form.Item
                      label="Company Name"
                      colon={false}
                      rules={[{ required: true, message: "Please enter company name" }]}
                    >
                      <Input
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        placeholder="Enter Company"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="Company Type"
                      colon={false}
                      rules={[{ required: true, message: "Please select company type" }]}
                    >
                      <Select
                        value={formData.companyType || undefined}
                        onChange={(value) => handleCompanyTypeChange(value)}
                        placeholder="Select Company Type"
                        style={{ width: "100%" }}
                        showSearch
                        optionFilterProp="children"
                      >
                        {COMPANY_TYPE_OPTIONS.map((opt) => (
                          <Option key={opt} value={opt}>
                            {opt}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                {formData.companyType === OTHER_VALUE && (
                  <Row gutter={[16, 16]} className="form-row">
                    <Col span={12} />
                    <Col span={12}>
                      <Form.Item
                        label="Specify company type"
                        colon={false}
                        rules={[{ required: true, message: "Please describe the company type" }]}
                      >
                        <Input
                          name="companyTypeOther"
                          value={formData.companyTypeOther ?? ""}
                          onChange={handleInputChange}
                          placeholder="Enter company type"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                )}

                <Row gutter={[16, 16]} className="form-row">
                  <Col span={12}>
                    <Form.Item
                      label="Industry Type"
                      colon={false}
                      rules={[{ required: true, message: "Please select industry type" }]}
                    >
                      <Select
                        value={formData.industryType || undefined}
                        onChange={(value) => handleIndustryTypeChange(value)}
                        placeholder="Select Industry Type"
                        style={{ width: "100%" }}
                        showSearch
                        optionFilterProp="children"
                      >
                        {INDUSTRY_TYPE_OPTIONS.map((opt) => (
                          <Option key={opt} value={opt}>
                            {opt}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="Designation"
                      colon={false}
                      rules={[{ required: true, message: "Please select designation" }]}
                    >
                      <Select
                        value={formData.designation}
                        onChange={(value) => handleSelectChange(value, "designation")}
                        placeholder="Select Designation"
                        style={{ width: "100%" }}
                      >
                        <Option value="Mining Engineer">Mining Engineer</Option>
                        <Option value="Geologist">Geologist</Option>
                        <Option value="Operations Manager">Operations Manager</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                {formData.industryType === OTHER_VALUE && (
                  <Row gutter={[16, 16]} className="form-row">
                    <Col span={12}>
                      <Form.Item
                        label="Specify industry"
                        colon={false}
                        rules={[{ required: true, message: "Please describe the industry type" }]}
                      >
                        <Input
                          name="industryTypeOther"
                          value={formData.industryTypeOther ?? ""}
                          onChange={handleInputChange}
                          placeholder="Enter industry type"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12} />
                  </Row>
                )}

                <Row gutter={[16, 16]} className="form-row">
                  <Col span={12}>
                    <Form.Item
                      label="Full Name"
                      colon={false}
                      rules={[{ required: true, message: "Please enter name" }]}
                    >
                      <Input
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Enter Name"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="Email"
                      colon={false}
                      rules={[{ required: true, message: "Please enter email", type: "email" }]}
                    >
                      <Input
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="Enter Email"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={[16, 16]} className="form-row">
                  <Col span={12}>
                    <Form.Item
                      label="Mobile No"
                      colon={false}
                      rules={[{ required: true, message: "Please enter mobile number" }]}
                    >
                      <Input
                        name="mobile"
                        value={formData.mobile}
                        onChange={handleInputChange}
                        placeholder="Enter Mobile No"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="WhatsApp No" colon={false}>
                      <Input
                        name="whatsapp"
                        value={formData.whatsapp}
                        onChange={handleInputChange}
                        placeholder="Enter WhatsApp No"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={[16, 16]} className="form-row">
                  <Col span={12}>
                    <Form.Item
                      label="Role"
                      colon={false}
                      rules={[{ required: true, message: "Please select role" }]}
                    >
                      <Select
                        value={formData.role}
                        onChange={(value) => handleSelectChange(value, "role")}
                        disabled
                        placeholder="Select Role"
                        style={{ width: "100%" }}
                      >
                        <Option value="admin">Admin</Option>
                        <Option value="manager">Manager</Option>
                        <Option value="worker">Worker</Option>
                      </Select>
                    </Form.Item>
                  </Col>

                  <Col span={12}>
                    <Form.Item label="City" colon={false}>
                      <Input
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="Enter City"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={[16, 16]} className="form-row">
                  <Col span={12}>
                    <Form.Item label="Address" colon={false}>
                      <Input.TextArea
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="Enter Address"
                        rows={3}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={[16, 16]} className="form-row">
                  <Col span={12}>
                    <Form.Item label="State" colon={false}>
                      <Input
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        placeholder="Enter State"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Country" colon={false}>
                      <Input
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        placeholder="Enter Country"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Zip Code" colon={false}>
                      <Input
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleInputChange}
                        placeholder="Enter Zip Code"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </div>
            <hr />
            <div className="button-group">
              <Button
                className="bg-secondary save-btn"
                icon={<ArrowRightOutlined />}
                onClick={handleSave}
                style={{ float: "right" }}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
        <div>
          <ImageContainer imageUrl="/images/auths/m7.jpg" />
        </div>
      </div>
      <ToastContainer />
    </>
  );
};
