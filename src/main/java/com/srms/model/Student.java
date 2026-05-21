package com.srms.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "students")
public class Student {

    @Id
    private String id;

    @Column(name = "roll_no", nullable = false, unique = true)
    private String rollNo;

    private String name;

    @Column(name = "klass")
    private String klass;   // "class" is a reserved word; expose as "class" in JSON via getter

    private String section;
    private String dob;
    private String email;
    private String password;

    public Student() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getRollNo() {
        return rollNo;
    }

    public void setRollNo(String rollNo) {
        this.rollNo = rollNo;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    // The front-end uses the field name "class".
    @com.fasterxml.jackson.annotation.JsonProperty("class")
    public String getKlass() {
        return klass;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("class")
    public void setKlass(String klass) {
        this.klass = klass;
    }

    public String getSection() {
        return section;
    }

    public void setSection(String section) {
        this.section = section;
    }

    public String getDob() {
        return dob;
    }

    public void setDob(String dob) {
        this.dob = dob;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
