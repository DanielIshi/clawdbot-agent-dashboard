import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Capacitor Configuration', () => {
  const projectRoot = path.resolve(__dirname, '../..')
  
  it('should have capacitor.config.ts file', () => {
    const configPath = path.join(projectRoot, 'capacitor.config.ts')
    expect(fs.existsSync(configPath)).toBe(true)
  })

  it('should have valid capacitor config with required fields', async () => {
    // Read and parse the config file
    const configPath = path.join(projectRoot, 'capacitor.config.ts')
    const configContent = fs.readFileSync(configPath, 'utf-8')
    
    // Check required fields are present
    expect(configContent).toContain('appId')
    expect(configContent).toContain('appName')
    expect(configContent).toContain('webDir')
  })

  it('should have correct appId format', async () => {
    const configPath = path.join(projectRoot, 'capacitor.config.ts')
    const configContent = fs.readFileSync(configPath, 'utf-8')
    
    // appId should be in reverse domain format
    const appIdMatch = configContent.match(/appId:\s*['"]([^'"]+)['"]/)
    expect(appIdMatch).toBeTruthy()
    expect(appIdMatch![1]).toMatch(/^[a-z]+\.[a-z]+\.[a-z]+$/)
  })

  it('should have webDir pointing to dist', async () => {
    const configPath = path.join(projectRoot, 'capacitor.config.ts')
    const configContent = fs.readFileSync(configPath, 'utf-8')
    
    // webDir should be 'dist' for Vite projects
    expect(configContent).toContain("webDir: 'dist'")
  })
})

describe('Capacitor Dependencies', () => {
  it('should have @capacitor/core installed', async () => {
    const packageJsonPath = path.resolve(__dirname, '../../package.json')
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
    
    expect(packageJson.dependencies['@capacitor/core']).toBeDefined()
  })

  it('should have @capacitor/cli installed', async () => {
    const packageJsonPath = path.resolve(__dirname, '../../package.json')
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
    
    expect(packageJson.dependencies['@capacitor/cli']).toBeDefined()
  })

  it('should have @capacitor/android installed', async () => {
    const packageJsonPath = path.resolve(__dirname, '../../package.json')
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
    
    expect(packageJson.dependencies['@capacitor/android']).toBeDefined()
  })
})

describe('Android Platform', () => {
  const projectRoot = path.resolve(__dirname, '../..')
  const androidDir = path.join(projectRoot, 'android')

  it('should have android directory', () => {
    expect(fs.existsSync(androidDir)).toBe(true)
  })

  it('should have build.gradle file', () => {
    const buildGradle = path.join(androidDir, 'build.gradle')
    expect(fs.existsSync(buildGradle)).toBe(true)
  })

  it('should have gradlew script', () => {
    const gradlew = path.join(androidDir, 'gradlew')
    expect(fs.existsSync(gradlew)).toBe(true)
  })

  it('should have app/build.gradle', () => {
    const appBuildGradle = path.join(androidDir, 'app', 'build.gradle')
    expect(fs.existsSync(appBuildGradle)).toBe(true)
  })

  it('should have correct applicationId in app/build.gradle', () => {
    const appBuildGradle = path.join(androidDir, 'app', 'build.gradle')
    const content = fs.readFileSync(appBuildGradle, 'utf-8')
    
    // Should match the appId from capacitor.config.ts
    expect(content).toContain('com.clawdbot.dashboard')
  })
})
