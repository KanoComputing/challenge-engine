#!groovy

pipeline {
    agent {
        label 'win-test'
    }

    stages {
        // pulls down locally the sources for the component
        stage('checkout') {
            steps {
                checkout scm
            }
        }

        // Install the bower dependencies of the component
        stage('install dependencies') {
            steps {
                script {
                    sh "npm install -g https://github.com/marcelmeulemans/wct-junit-reporter.git"
                    sh "npm i"
                    sh "bower i"
                }
            }
        }

        // Lints, and tests the component
        stage('test') {
            steps {
                script {
                    sh "wct --local chrome"
                    junit allowEmptyResults: true, testResults: 'wct.xml'
                }
            }
        }
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '5'))
    }
}